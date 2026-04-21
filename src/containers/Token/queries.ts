import type { ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import { getTokenRiskLendingExposures } from './api'
import type { TokenRiskLendingExposuresResponse } from './api.types'
import type { TokenRiskResponse } from './tokenRisk.types'
import {
	buildExposuresSection,
	filterTokenRiskCandidatesWithData,
	indexExposuresByAssetKey,
	inferTokenRiskCandidatesFromExposures,
	mergeIndexedExposures,
	resolveTokenRiskCandidates,
	TOKEN_RISK_LIMITATIONS_COMMON,
	TOKEN_RISK_LIMITATION_BORROWED_DEBT_NULLS
} from './tokenRisk.utils'

const LENDING_EXPOSURES_CACHE_TTL_MS = 5 * 60 * 1000

type IndexedLendingExposuresCache = {
	data: TokenRiskLendingExposuresResponse
	indexedExposures: ReturnType<typeof indexExposuresByAssetKey>
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

let lendingExposuresCache: IndexedLendingExposuresCache | null = null
let lendingExposuresInFlight: Promise<IndexedLendingExposuresCache> | null = null

export function resetTokenRiskBorrowRoutesCache() {
	lendingExposuresCache = null
	lendingExposuresInFlight = null
}

async function getIndexedLendingExposuresCache(): Promise<IndexedLendingExposuresCache> {
	const now = Date.now()
	if (lendingExposuresCache && now - lendingExposuresCache.fetchedAt < LENDING_EXPOSURES_CACHE_TTL_MS) {
		return lendingExposuresCache
	}

	if (lendingExposuresInFlight) {
		return lendingExposuresInFlight
	}

	lendingExposuresInFlight = getTokenRiskLendingExposures()
		.then((data) => ({
			data,
			indexedExposures: indexExposuresByAssetKey(data.exposures),
			fetchedAt: Date.now()
		}))
		.then((cacheValue) => {
			lendingExposuresCache = cacheValue
			return cacheValue
		})
		.finally(() => {
			lendingExposuresInFlight = null
		})

	return lendingExposuresInFlight
}

export async function getTokenRiskData({
	geckoId,
	tokenSymbol,
	protocolLlamaswapDataset,
	displayLookups
}: TokenRiskQueryInput): Promise<TokenRiskResponse | null> {
	const lendingExposuresSnapshot = await getIndexedLendingExposuresCache()
	const metadataCandidates = resolveTokenRiskCandidates(geckoId, protocolLlamaswapDataset)
	const candidates =
		metadataCandidates.length > 0
			? metadataCandidates
			: inferTokenRiskCandidatesFromExposures({
					tokenSymbol,
					exposures: lendingExposuresSnapshot.data.exposures,
					chainDisplayNames: displayLookups.chainDisplayNames
				})
	if (candidates.length === 0) return null

	const scopeCandidates = filterTokenRiskCandidatesWithData(candidates, lendingExposuresSnapshot.indexedExposures)
	if (scopeCandidates.length === 0) return null

	const activeExposures = mergeIndexedExposures(
		lendingExposuresSnapshot.indexedExposures,
		scopeCandidates.map((candidate) => candidate.key)
	)

	const exposures = buildExposuresSection(activeExposures, lendingExposuresSnapshot.data.methodologies, displayLookups)
	if (exposures.rows.length === 0) return null

	return {
		candidates,
		scopeCandidates,
		selectedCandidateKey: null,
		exposures,
		limitations: [
			...TOKEN_RISK_LIMITATIONS_COMMON,
			...(exposures.summary.borrowedDebtUnknownCount > 0 ? [TOKEN_RISK_LIMITATION_BORROWED_DEBT_NULLS] : [])
		]
	}
}
