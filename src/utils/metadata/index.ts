import type { TokenDirectory } from '~/utils/tokenDirectory'
import bridgeChainSlugsRaw from '../../../.cache/bridgeChainSlugs.json'
import bridgeChainSlugToNameRaw from '../../../.cache/bridgeChainSlugToName.json'
import bridgeProtocolSlugsRaw from '../../../.cache/bridgeProtocolSlugs.json'
import categoriesAndTags from '../../../.cache/categoriesAndTags.json'
import cexs from '../../../.cache/cexs.json'
import cgExchangeIdentifiersRaw from '../../../.cache/cgExchangeIdentifiers.json'
import chainDisplayNamesRaw from '../../../.cache/chainDisplayNames.json'
import chainMetadata from '../../../.cache/chains.json'
import emissionsProtocolsListRaw from '../../../.cache/emissionsProtocolsList.json'
import liquidationsTokenSymbolsRaw from '../../../.cache/liquidationsTokenSymbols.json'
import protocolLlamaswapDatasetRaw from '../../../.cache/llamaswap-protocols.json'
import protocolDisplayNamesRaw from '../../../.cache/protocolDisplayNames.json'
import protocolMetadata from '../../../.cache/protocols.json'
import rwaList from '../../../.cache/rwa.json'
import rwaPerpsList from '../../../.cache/rwaPerps.json'
import tokenlistRaw from '../../../.cache/tokenlist.json'
import tokenDirectoryRaw from '../../../.cache/tokens.json'
import { createStringLookupMap } from './displayLookups'
import { fetchCoreMetadata } from './fetch'
import type {
	ICategoriesAndTags,
	ICexItem,
	IChainMetadata,
	IProtocolMetadata,
	ProtocolLlamaswapMetadata,
	IRWAList,
	IRWAPerpsList,
	ITokenListEntry
} from './types'

const metadataCache: {
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	categoriesAndTags: ICategoriesAndTags
	cexs: Array<ICexItem>
	rwaList: IRWAList
	rwaPerpsList: IRWAPerpsList
	tokenlist: Record<string, ITokenListEntry>
	tokenDirectory: TokenDirectory
	protocolDisplayNames: Map<string, string>
	chainDisplayNames: Map<string, string>
	liquidationsTokenSymbols: string[]
	liquidationsTokenSymbolsSet: Set<string>
	emissionsProtocolsList: string[]
	cgExchangeIdentifiers: string[]
	bridgeProtocolSlugs: string[]
	bridgeChainSlugs: string[]
	bridgeChainSlugToName: Record<string, string>
	protocolLlamaswapDataset: ProtocolLlamaswapMetadata
} = {
	chainMetadata,
	protocolMetadata,
	categoriesAndTags,
	cexs,
	rwaList: rwaList as IRWAList,
	rwaPerpsList: {
		...(rwaPerpsList as IRWAPerpsList),
		assetGroups: (rwaPerpsList as IRWAPerpsList).assetGroups ?? []
	},
	tokenlist: tokenlistRaw as Record<string, ITokenListEntry>,
	tokenDirectory: tokenDirectoryRaw as TokenDirectory,
	protocolDisplayNames: createStringLookupMap(protocolDisplayNamesRaw as Record<string, string>),
	chainDisplayNames: createStringLookupMap(chainDisplayNamesRaw as Record<string, string>),
	liquidationsTokenSymbols: liquidationsTokenSymbolsRaw as string[],
	liquidationsTokenSymbolsSet: new Set(liquidationsTokenSymbolsRaw as string[]),
	emissionsProtocolsList: emissionsProtocolsListRaw as string[],
	cgExchangeIdentifiers: cgExchangeIdentifiersRaw as string[],
	bridgeProtocolSlugs: bridgeProtocolSlugsRaw as string[],
	bridgeChainSlugs: bridgeChainSlugsRaw as string[],
	bridgeChainSlugToName: bridgeChainSlugToNameRaw as Record<string, string>,
	protocolLlamaswapDataset: protocolLlamaswapDatasetRaw as ProtocolLlamaswapMetadata
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
			rwaPerpsList: rwaPerpsListData,
			tokenlist,
			tokenDirectory,
			protocolDisplayNames,
			chainDisplayNames,
			liquidationsTokenSymbols,
			emissionsProtocolsList,
			cgExchangeIdentifiers: cgExIds,
			bridgeProtocolSlugs,
			bridgeChainSlugs,
			bridgeChainSlugToName,
			protocolLlamaswapDataset
		} = await fetchCoreMetadata({
			existingProtocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset
		})

		metadataCache.protocolMetadata = protocols
		metadataCache.chainMetadata = chains
		metadataCache.categoriesAndTags = catAndTags
		metadataCache.cexs = cexData
		metadataCache.rwaList = rwaListData
		metadataCache.rwaPerpsList = rwaPerpsListData
		metadataCache.cgExchangeIdentifiers = cgExIds
		metadataCache.tokenlist = tokenlist
		metadataCache.tokenDirectory = tokenDirectory
		metadataCache.protocolDisplayNames = createStringLookupMap(protocolDisplayNames)
		metadataCache.chainDisplayNames = createStringLookupMap(chainDisplayNames)
		metadataCache.liquidationsTokenSymbols = liquidationsTokenSymbols
		metadataCache.liquidationsTokenSymbolsSet = new Set(liquidationsTokenSymbols)
		metadataCache.emissionsProtocolsList = emissionsProtocolsList
		metadataCache.bridgeProtocolSlugs = bridgeProtocolSlugs
		metadataCache.bridgeChainSlugs = bridgeChainSlugs
		metadataCache.bridgeChainSlugToName = bridgeChainSlugToName
		metadataCache.protocolLlamaswapDataset = protocolLlamaswapDataset

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

	if (refreshInFlight !== null) {
		// Another refresh is already running; wait for it
		return refreshInFlight
	}

	refreshInFlight = doRefresh().finally(() => {
		refreshInFlight = null
	})

	return refreshInFlight
}

export default metadataCache
