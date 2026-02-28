import categoriesAndTags from '../../../.cache/categoriesAndTags.json'
import cexs from '../../../.cache/cexs.json'
import cgExchangeIdentifiersRaw from '../../../.cache/cgExchangeIdentifiers.json'
import chainMetadata from '../../../.cache/chains.json'
import protocolMetadata from '../../../.cache/protocols.json'
import rwaList from '../../../.cache/rwa.json'
import tokenlistRaw from '../../../.cache/tokenlist.json'
import { fetchCoreMetadata } from './fetch'
import type { ICexItem, IChainMetadata, IProtocolMetadata, IRWAList, ITokenListEntry } from './types'

const metadataCache: {
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	categoriesAndTags: {
		categories: Array<string>
		tags: Array<string>
		tagCategoryMap: Record<string, string>
	}
	cexs: Array<ICexItem>
	rwaList: IRWAList
	tokenlist: Record<string, ITokenListEntry>
	cgExchangeIdentifiers: string[]
} = {
	chainMetadata,
	protocolMetadata,
	categoriesAndTags,
	cexs,
	rwaList,
	tokenlist: tokenlistRaw as Record<string, ITokenListEntry>,
	cgExchangeIdentifiers: cgExchangeIdentifiersRaw as string[]
}

// On-demand refresh with TTL (1 hour) and concurrency-safe deduplication
const REFRESH_TTL_MS = 60 * 60 * 1000 // 1 hour
let lastRefreshMs = 0
let refreshInFlight: Promise<void> | null = null

async function doRefresh(): Promise<void> {
	try {
		const {
			protocols,
			chains,
			categoriesAndTags: catAndTags,
			cexs: cexData,
			rwaList: rwaListData,
			tokenlist,
			cgExchangeIdentifiers: cgExIds
		} = await fetchCoreMetadata()

		metadataCache.protocolMetadata = protocols
		metadataCache.chainMetadata = chains
		metadataCache.categoriesAndTags = catAndTags
		metadataCache.cexs = cexData
		metadataCache.rwaList = rwaListData
		metadataCache.cgExchangeIdentifiers = cgExIds
		metadataCache.tokenlist = tokenlist

		lastRefreshMs = Date.now()
	} catch (err) {
		console.error('[metadata] refresh failed, keeping stale cache:', err)
	}
}

/**
 * Refresh metadata cache if stale (older than TTL).
 * Safe to call from multiple concurrent requests—only one refresh runs at a time.
 */
export async function refreshMetadataIfStale(): Promise<void> {
	const now = Date.now()
	if (now - lastRefreshMs < REFRESH_TTL_MS) {
		// Cache is fresh
		return
	}

	if (refreshInFlight) {
		// Another refresh is already running; wait for it
		return refreshInFlight
	}

	refreshInFlight = doRefresh().finally(() => {
		refreshInFlight = null
	})

	return refreshInFlight
}

export default metadataCache
