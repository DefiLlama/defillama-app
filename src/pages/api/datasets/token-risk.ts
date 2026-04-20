import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenRiskBorrowRoutes, getTokenRiskLendingRisks } from '~/containers/Token/api'
import type { TokenRiskBorrowRoutesResponse } from '~/containers/Token/api.types'
import type { TokenRiskResponse } from '~/containers/Token/tokenRisk.types'
import {
	buildBorrowCapsSection,
	buildCollateralRiskSection,
	buildSelectedChainRisk,
	filterTokenRiskCandidatesWithData,
	indexBorrowRoutesByAssetKey,
	mergeIndexedBuckets,
	resolveTokenRiskCandidates,
	TOKEN_RISK_LIMITATIONS
} from '~/containers/Token/tokenRisk.utils'
import { slug } from '~/utils'
import metadataCache, { refreshMetadataIfStale } from '~/utils/metadata'
import type { IChainMetadata, IProtocolMetadata } from '~/utils/metadata/types'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'
const BORROW_ROUTES_CACHE_TTL_MS = 5 * 60 * 1000

type IndexedBorrowRoutesCache = {
	data: TokenRiskBorrowRoutesResponse
	indexedRoutes: ReturnType<typeof indexBorrowRoutesByAssetKey>
	fetchedAt: number
}

let borrowRoutesCache: IndexedBorrowRoutesCache | null = null
let borrowRoutesInFlight: Promise<IndexedBorrowRoutesCache> | null = null

function createProtocolDisplayNameLookup(protocolMetadata: Record<string, IProtocolMetadata>): Map<string, string> {
	const lookup = new Map<string, string>()

	for (const metadata of Object.values(protocolMetadata)) {
		if (!metadata?.name) continue
		lookup.set(metadata.name, metadata.displayName ?? metadata.name)
	}

	return lookup
}

function createChainDisplayNameLookup(chainMetadata: Record<string, IChainMetadata>): Map<string, string> {
	const lookup = new Map<string, string>()

	for (const metadata of Object.values(chainMetadata)) {
		if (!metadata?.name) continue
		lookup.set(slug(metadata.name), metadata.name)
	}

	return lookup
}

function readSingleQueryParam(value: string | string[] | undefined): string | null {
	if (typeof value === 'string') return value.trim() || null
	if (Array.isArray(value)) return value[0]?.trim() || null
	return null
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

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<TokenRiskResponse | { error: string }>
) {
	try {
		const geckoId = readSingleQueryParam(req.query.geckoId)
		const selectedCandidateKey = readSingleQueryParam(req.query.candidate)?.toLowerCase() ?? null

		if (!geckoId) {
			res.status(400).json({ error: 'Missing geckoId query param' })
			return
		}

		await refreshMetadataIfStale()

		const candidates = resolveTokenRiskCandidates(geckoId, metadataCache.protocolLlamaswapDataset)
		const candidateKeys = candidates.map((candidate) => candidate.key)
		const displayLookups = {
			protocolDisplayNames: createProtocolDisplayNameLookup(metadataCache.protocolMetadata),
			chainDisplayNames: createChainDisplayNameLookup(metadataCache.chainMetadata)
		}

		if (selectedCandidateKey && !candidateKeys.includes(selectedCandidateKey)) {
			res.status(400).json({ error: 'Unknown token risk candidate' })
			return
		}

		const borrowRoutesSnapshot = await getIndexedBorrowRoutesCache()
		const scopeCandidates = filterTokenRiskCandidatesWithData(candidates, borrowRoutesSnapshot.indexedRoutes)
		const fallbackBucket = mergeIndexedBuckets(
			borrowRoutesSnapshot.indexedRoutes,
			selectedCandidateKey ? [selectedCandidateKey] : candidateKeys
		)

		let selectedChainRisk = null
		let activeBucket = fallbackBucket
		let activeMethodologies = borrowRoutesSnapshot.data.methodologies

		if (selectedCandidateKey) {
			try {
				const exactChainRisk = await getTokenRiskLendingRisks(selectedCandidateKey)
				selectedChainRisk = buildSelectedChainRisk(selectedCandidateKey, exactChainRisk, fallbackBucket)
			} catch (error) {
				console.error(`Error fetching token lending risks for ${selectedCandidateKey}:`, error)
				selectedChainRisk = buildSelectedChainRisk(selectedCandidateKey, null, fallbackBucket)
			}

			if (selectedChainRisk.bucket) {
				activeBucket = selectedChainRisk.bucket
			}
			if (selectedChainRisk.methodologies) {
				activeMethodologies = selectedChainRisk.methodologies
			}
		}

		res.setHeader('Cache-Control', CACHE_CONTROL)
		res.status(200).json({
			candidates,
			scopeCandidates,
			selectedCandidateKey,
			borrowCaps: buildBorrowCapsSection(activeBucket, activeMethodologies, displayLookups),
			collateralRisk: buildCollateralRiskSection(activeBucket, activeMethodologies, displayLookups),
			selectedChainRisk,
			limitations: [...TOKEN_RISK_LIMITATIONS]
		})
	} catch (error) {
		console.error('Error fetching token risk data:', error)
		res.status(500).json({ error: 'Failed to fetch token risk data' })
	}
}
