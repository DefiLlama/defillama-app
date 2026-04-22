import type { ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import { getTokenRiskBorrowCapacity } from './api'
import type { TokenRiskBorrowCapacityResponse } from './api.types'
import type { TokenRiskResponse } from './tokenRisk.types'
import {
	buildExposuresSection,
	filterTokenRiskCandidatesWithData,
	indexBorrowCapacityByAssetKey,
	inferTokenRiskCandidatesFromBorrowCapacity,
	mergeIndexedBorrowCapacity,
	resolveTokenRiskCandidates,
	TOKEN_RISK_LIMITATIONS_COMMON,
	TOKEN_RISK_LIMITATION_MIN_BAD_DEBT_NULLS
} from './tokenRisk.utils'

const BORROW_CAPACITY_CACHE_TTL_MS = 5 * 60 * 1000

type IndexedBorrowCapacityCache = {
	data: TokenRiskBorrowCapacityResponse
	indexedTokens: ReturnType<typeof indexBorrowCapacityByAssetKey>
	fetchedAt: number
}

type TokenRiskDisplayLookups = {
	protocolDisplayNames: Map<string, string>
	chainDisplayNames: Map<string, string>
}

type TokenRiskQueryInput = {
	geckoId: string
	tokenSymbol: string
	protocolLlamaswapDataset: ProtocolLlamaswapMetadata
	displayLookups: TokenRiskDisplayLookups
}

let borrowCapacityCache: IndexedBorrowCapacityCache | null = null
let borrowCapacityInFlight: Promise<IndexedBorrowCapacityCache> | null = null

export function resetTokenRiskBorrowRoutesCache() {
	borrowCapacityCache = null
	borrowCapacityInFlight = null
}

async function getIndexedBorrowCapacityCache(): Promise<IndexedBorrowCapacityCache> {
	const now = Date.now()
	if (borrowCapacityCache && now - borrowCapacityCache.fetchedAt < BORROW_CAPACITY_CACHE_TTL_MS) {
		return borrowCapacityCache
	}

	if (borrowCapacityInFlight) {
		return borrowCapacityInFlight
	}

	borrowCapacityInFlight = getTokenRiskBorrowCapacity()
		.then((data) => ({
			data,
			indexedTokens: indexBorrowCapacityByAssetKey(data.tokens),
			fetchedAt: Date.now()
		}))
		.then((cacheValue) => {
			borrowCapacityCache = cacheValue
			return cacheValue
		})
		.finally(() => {
			borrowCapacityInFlight = null
		})

	return borrowCapacityInFlight
}

export async function getTokenRiskData({
	geckoId,
	tokenSymbol,
	protocolLlamaswapDataset,
	displayLookups
}: TokenRiskQueryInput): Promise<TokenRiskResponse | null> {
	const borrowCapacitySnapshot = await getIndexedBorrowCapacityCache()
	const metadataCandidates = resolveTokenRiskCandidates(geckoId, protocolLlamaswapDataset)
	const candidates =
		metadataCandidates.length > 0
			? metadataCandidates
			: inferTokenRiskCandidatesFromBorrowCapacity({
					tokenSymbol,
					tokens: borrowCapacitySnapshot.data.tokens,
					chainDisplayNames: displayLookups.chainDisplayNames
				})
	if (candidates.length === 0) return null

	const scopeCandidates = filterTokenRiskCandidatesWithData(candidates, borrowCapacitySnapshot.indexedTokens)
	if (scopeCandidates.length === 0) return null

	const activeTokens = mergeIndexedBorrowCapacity(
		borrowCapacitySnapshot.indexedTokens,
		scopeCandidates.map((candidate) => candidate.key)
	)

	const exposures = buildExposuresSection(activeTokens, borrowCapacitySnapshot.data.methodologies, displayLookups)
	if (exposures.rows.length === 0) return null

	return {
		candidates,
		scopeCandidates,
		selectedCandidateKey: null,
		exposures,
		limitations: [
			...TOKEN_RISK_LIMITATIONS_COMMON,
			...(exposures.summary.minBadDebtUnknownCount > 0 ? [TOKEN_RISK_LIMITATION_MIN_BAD_DEBT_NULLS] : [])
		]
	}
}
