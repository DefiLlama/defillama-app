import type { ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import { getTokenRiskBorrowRoutes } from './api'
import type { TokenRiskBorrowRoutesResponse } from './api.types'
import type { TokenRiskResponse } from './tokenRisk.types'
import {
	buildBorrowCapsSection,
	buildCollateralRiskSection,
	filterTokenRiskCandidatesWithData,
	inferTokenRiskCandidatesFromRoutes,
	indexBorrowRoutesByAssetKey,
	mergeIndexedBuckets,
	resolveTokenRiskCandidates,
	TOKEN_RISK_LIMITATION_COLLATERAL_SIDE,
	TOKEN_RISK_LIMITATIONS_COMMON,
	TOKEN_RISK_LIMITATION_DEBT_SIDE
} from './tokenRisk.utils'

const BORROW_ROUTES_CACHE_TTL_MS = 5 * 60 * 1000

type IndexedBorrowRoutesCache = {
	data: TokenRiskBorrowRoutesResponse
	indexedRoutes: ReturnType<typeof indexBorrowRoutesByAssetKey>
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

let borrowRoutesCache: IndexedBorrowRoutesCache | null = null
let borrowRoutesInFlight: Promise<IndexedBorrowRoutesCache> | null = null

export function resetTokenRiskBorrowRoutesCache() {
	borrowRoutesCache = null
	borrowRoutesInFlight = null
}

async function getIndexedBorrowRoutesCache(): Promise<IndexedBorrowRoutesCache> {
	const now = Date.now()
	if (borrowRoutesCache && now - borrowRoutesCache.fetchedAt < BORROW_ROUTES_CACHE_TTL_MS) {
		return borrowRoutesCache
	}

	if (borrowRoutesInFlight) {
		return borrowRoutesInFlight
	}

	borrowRoutesInFlight = getTokenRiskBorrowRoutes()
		.then((data) => ({
			data,
			indexedRoutes: indexBorrowRoutesByAssetKey(data.routes),
			fetchedAt: Date.now()
		}))
		.then((cacheValue) => {
			borrowRoutesCache = cacheValue
			return cacheValue
		})
		.finally(() => {
			borrowRoutesInFlight = null
		})

	return borrowRoutesInFlight
}

export async function getTokenRiskData({
	geckoId,
	tokenSymbol,
	protocolLlamaswapDataset,
	displayLookups
}: TokenRiskQueryInput): Promise<TokenRiskResponse | null> {
	const borrowRoutesSnapshot = await getIndexedBorrowRoutesCache()
	const metadataCandidates = resolveTokenRiskCandidates(geckoId, protocolLlamaswapDataset)
	const candidates =
		metadataCandidates.length > 0
			? metadataCandidates
			: inferTokenRiskCandidatesFromRoutes({
					tokenSymbol,
					routes: borrowRoutesSnapshot.data.routes,
					chainDisplayNames: displayLookups.chainDisplayNames
				})
	if (candidates.length === 0) return null

	const scopeCandidates = filterTokenRiskCandidatesWithData(candidates, borrowRoutesSnapshot.indexedRoutes)
	if (scopeCandidates.length === 0) return null

	const activeBucket = mergeIndexedBuckets(
		borrowRoutesSnapshot.indexedRoutes,
		scopeCandidates.map((candidate) => candidate.key)
	)

	const borrowCaps = buildBorrowCapsSection(activeBucket, borrowRoutesSnapshot.data.methodologies, displayLookups)
	const collateralRisk = buildCollateralRiskSection(
		activeBucket,
		borrowRoutesSnapshot.data.methodologies,
		displayLookups
	)

	if (borrowCaps.rows.length === 0 && collateralRisk.rows.length === 0) return null

	return {
		candidates,
		scopeCandidates,
		selectedCandidateKey: null,
		borrowCaps,
		collateralRisk,
		selectedChainRisk: null,
		limitations: [
			...TOKEN_RISK_LIMITATIONS_COMMON,
			...(collateralRisk.rows.length > 0 ? [TOKEN_RISK_LIMITATION_COLLATERAL_SIDE] : []),
			...(borrowCaps.rows.length > 0 ? [TOKEN_RISK_LIMITATION_DEBT_SIDE] : [])
		]
	}
}
