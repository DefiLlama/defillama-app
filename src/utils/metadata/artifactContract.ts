import type { TokenDirectory } from '~/utils/tokenDirectory'
import { buildChainDisplayNameLookupRecord, createStringLookupMap } from './displayLookups'
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

export type CoreMetadataPayload = {
	protocols: Record<string, IProtocolMetadata>
	chains: Record<string, IChainMetadata>
	categoriesAndTags: ICategoriesAndTags
	cexs: ICexItem[]
	rwaList: IRWAList
	rwaPerpsList: IRWAPerpsList
	tokenlist: Record<string, ITokenListEntry>
	tokenDirectory: TokenDirectory
	protocolDisplayNames: Record<string, string>
	chainDisplayNames: Record<string, string>
	liquidationsTokenSymbols: string[]
	emissionsProtocolsList: string[]
	cgExchangeIdentifiers: string[]
	bridgeProtocolSlugs: string[]
	bridgeChainSlugs: string[]
	bridgeChainSlugToName: Record<string, string>
	protocolLlamaswapDataset: ProtocolLlamaswapMetadata
}

export type MetadataCache = {
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
}

export const METADATA_ARTIFACT_FILES = {
	chains: 'chains.json',
	protocols: 'protocols.json',
	categoriesAndTags: 'categoriesAndTags.json',
	cexs: 'cexs.json',
	rwaList: 'rwa.json',
	rwaPerpsList: 'rwaPerps.json',
	tokenlist: 'tokenlist.json',
	tokenDirectory: 'tokens.json',
	protocolDisplayNames: 'protocolDisplayNames.json',
	chainDisplayNames: 'chainDisplayNames.json',
	liquidationsTokenSymbols: 'liquidationsTokenSymbols.json',
	emissionsProtocolsList: 'emissionsProtocolsList.json',
	cgExchangeIdentifiers: 'cgExchangeIdentifiers.json',
	bridgeProtocolSlugs: 'bridgeProtocolSlugs.json',
	bridgeChainSlugs: 'bridgeChainSlugs.json',
	bridgeChainSlugToName: 'bridgeChainSlugToName.json',
	protocolLlamaswapDataset: 'llamaswap-protocols.json'
} as const satisfies Record<keyof CoreMetadataPayload, string>

export const METADATA_CI_STUBS = {
	protocols: {},
	chains: {},
	categoriesAndTags: { categories: [], tags: [], tagCategoryMap: {}, configs: {} },
	cexs: [],
	rwaList: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} },
	rwaPerpsList: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 },
	tokenlist: {},
	tokenDirectory: {},
	protocolDisplayNames: {},
	chainDisplayNames: {},
	liquidationsTokenSymbols: [],
	emissionsProtocolsList: [],
	cgExchangeIdentifiers: [],
	bridgeProtocolSlugs: [],
	bridgeChainSlugs: [],
	bridgeChainSlugToName: {},
	protocolLlamaswapDataset: {}
} satisfies CoreMetadataPayload

export function getMetadataArtifactEntries(payload: CoreMetadataPayload): Array<[string, unknown]> {
	const entries: Array<[string, unknown]> = []
	for (const key in METADATA_ARTIFACT_FILES) {
		const artifactKey = key as keyof CoreMetadataPayload
		entries.push([METADATA_ARTIFACT_FILES[artifactKey], payload[artifactKey]])
	}
	return entries
}

function hasRecordEntries(value: Record<string, unknown>): boolean {
	return Object.keys(value).length > 0
}

export function createMetadataCacheFromArtifacts(payload: CoreMetadataPayload): MetadataCache {
	return {
		chainMetadata: payload.chains,
		protocolMetadata: payload.protocols,
		categoriesAndTags: payload.categoriesAndTags,
		cexs: payload.cexs,
		rwaList: payload.rwaList,
		rwaPerpsList: {
			...payload.rwaPerpsList,
			assetGroups: payload.rwaPerpsList.assetGroups ?? []
		},
		tokenlist: payload.tokenlist,
		tokenDirectory: payload.tokenDirectory,
		protocolDisplayNames: createStringLookupMap(payload.protocolDisplayNames),
		chainDisplayNames: createStringLookupMap({
			...payload.chainDisplayNames,
			...buildChainDisplayNameLookupRecord(payload.chains)
		}),
		liquidationsTokenSymbols: payload.liquidationsTokenSymbols,
		liquidationsTokenSymbolsSet: new Set(payload.liquidationsTokenSymbols),
		emissionsProtocolsList: payload.emissionsProtocolsList,
		cgExchangeIdentifiers: payload.cgExchangeIdentifiers,
		bridgeProtocolSlugs: payload.bridgeProtocolSlugs,
		bridgeChainSlugs: payload.bridgeChainSlugs,
		bridgeChainSlugToName: payload.bridgeChainSlugToName,
		protocolLlamaswapDataset: payload.protocolLlamaswapDataset
	}
}

export function applyMetadataRefresh(metadataCache: MetadataCache, payload: CoreMetadataPayload): void {
	if (hasRecordEntries(payload.protocols)) {
		metadataCache.protocolMetadata = payload.protocols
		metadataCache.protocolDisplayNames = createStringLookupMap(payload.protocolDisplayNames)
	} else {
		console.error('[metadata] refresh returned empty protocol metadata, keeping stale cache')
	}

	if (hasRecordEntries(payload.chains)) {
		metadataCache.chainMetadata = payload.chains
		metadataCache.chainDisplayNames = createStringLookupMap(payload.chainDisplayNames)
	} else {
		console.error('[metadata] refresh returned empty chain metadata, keeping stale cache')
	}

	metadataCache.categoriesAndTags = payload.categoriesAndTags
	metadataCache.cexs = payload.cexs
	metadataCache.rwaList = payload.rwaList
	metadataCache.rwaPerpsList = payload.rwaPerpsList
	metadataCache.cgExchangeIdentifiers = payload.cgExchangeIdentifiers
	if (hasRecordEntries(payload.tokenlist)) {
		metadataCache.tokenlist = payload.tokenlist
	} else {
		console.error('[metadata] refresh returned an empty tokenlist, keeping stale cache')
	}
	if (hasRecordEntries(payload.tokenDirectory)) {
		metadataCache.tokenDirectory = payload.tokenDirectory
	} else {
		console.error('[metadata] refresh returned an empty token directory, keeping stale cache')
	}
	metadataCache.liquidationsTokenSymbols = payload.liquidationsTokenSymbols
	metadataCache.liquidationsTokenSymbolsSet = new Set(payload.liquidationsTokenSymbols)
	metadataCache.emissionsProtocolsList = payload.emissionsProtocolsList
	metadataCache.bridgeProtocolSlugs = payload.bridgeProtocolSlugs
	metadataCache.bridgeChainSlugs = payload.bridgeChainSlugs
	metadataCache.bridgeChainSlugToName = payload.bridgeChainSlugToName
	metadataCache.protocolLlamaswapDataset = payload.protocolLlamaswapDataset
}
