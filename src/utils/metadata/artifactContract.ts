import type { ProtocolEmissionSupplyMetricsMap } from '~/containers/Unlocks/api.types'
import type { TokenDirectory } from '~/utils/tokenDirectory'
import { buildChainDisplayNameLookupRecord, createStringLookupMap } from './displayLookups'
import type {
	DigitalAssetTreasuryRoutesMetadata,
	NarrativeCategoriesMetadata,
	OracleRoutesMetadata
} from './routeIndexes'
import type {
	ICategoriesAndTags,
	ICexItem,
	IChainMetadata,
	IEmissionsHistoricalPrices,
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
	chainCategories: string[]
	liquidationsTokenSymbols: string[]
	emissionsProtocolsList: string[]
	emissionsSupplyMetrics: ProtocolEmissionSupplyMetricsMap
	emissionsHistoricalPrices: IEmissionsHistoricalPrices
	cgExchangeIdentifiers: string[]
	bridgeProtocolSlugs: string[]
	bridgeChainSlugs: string[]
	bridgeChainSlugToName: Record<string, string>
	protocolLlamaswapDataset: ProtocolLlamaswapMetadata
	narrativeCategories: NarrativeCategoriesMetadata
	oracleRoutes: OracleRoutesMetadata
	digitalAssetTreasuryRoutes: DigitalAssetTreasuryRoutesMetadata
	stablecoinPeggedAssetSlugs: string[]
}

// Serialized artifacts intentionally differ from this runtime shape: the cache
// adds Maps/Sets and historical field names that are consumed throughout pages.
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
	chainCategories: string[]
	liquidationsTokenSymbols: string[]
	liquidationsTokenSymbolsSet: Set<string>
	emissionsProtocolsList: string[]
	emissionsSupplyMetrics: ProtocolEmissionSupplyMetricsMap
	emissionsHistoricalPrices: IEmissionsHistoricalPrices
	cgExchangeIdentifiers: string[]
	bridgeProtocolSlugs: string[]
	bridgeChainSlugs: string[]
	bridgeChainSlugToName: Record<string, string>
	protocolLlamaswapDataset: ProtocolLlamaswapMetadata
	narrativeCategories: NarrativeCategoriesMetadata
	narrativeCategoryIdsSet: Set<string>
	oracleRoutes: OracleRoutesMetadata
	digitalAssetTreasuryRoutes: DigitalAssetTreasuryRoutesMetadata
	digitalAssetTreasuryAssetSlugsSet: Set<string>
	digitalAssetTreasuryCompanySlugsSet: Set<string>
	stablecoinPeggedAssetSlugs: string[]
	stablecoinPeggedAssetSlugsSet: Set<string>
}

export type MetadataArtifactKey = keyof CoreMetadataPayload

type MetadataArtifactDefinition<Key extends MetadataArtifactKey> = {
	file: string
	stub: CoreMetadataPayload[Key]
	parse: (value: unknown, file: string) => CoreMetadataPayload[Key]
}

type MetadataArtifactRegistry = {
	[Key in MetadataArtifactKey]: MetadataArtifactDefinition<Key>
}

function defineMetadataArtifactRegistry<const Registry extends MetadataArtifactRegistry>(registry: Registry): Registry {
	return registry
}

function parseArtifact<T>(value: unknown, _file?: string): T {
	return value as T
}

export const METADATA_ARTIFACT_REGISTRY = defineMetadataArtifactRegistry({
	chains: {
		file: 'chains.json',
		stub: {},
		parse: parseArtifact<Record<string, IChainMetadata>>
	},
	protocols: {
		file: 'protocols.json',
		stub: {},
		parse: parseArtifact<Record<string, IProtocolMetadata>>
	},
	categoriesAndTags: {
		file: 'categoriesAndTags.json',
		stub: { categories: [], tags: [], tagCategoryMap: {}, configs: {} },
		parse: parseArtifact<ICategoriesAndTags>
	},
	cexs: {
		file: 'cexs.json',
		stub: [],
		parse: parseArtifact<ICexItem[]>
	},
	rwaList: {
		file: 'rwa.json',
		stub: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} },
		parse: parseArtifact<IRWAList>
	},
	rwaPerpsList: {
		file: 'rwaPerps.json',
		stub: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 },
		parse: parseArtifact<IRWAPerpsList>
	},
	tokenlist: {
		file: 'tokenlist.json',
		stub: {},
		parse: parseArtifact<Record<string, ITokenListEntry>>
	},
	tokenDirectory: {
		file: 'tokens.json',
		stub: {},
		parse: parseArtifact<TokenDirectory>
	},
	protocolDisplayNames: {
		file: 'protocolDisplayNames.json',
		stub: {},
		parse: parseArtifact<Record<string, string>>
	},
	chainDisplayNames: {
		file: 'chainDisplayNames.json',
		stub: {},
		parse: parseArtifact<Record<string, string>>
	},
	chainCategories: {
		file: 'chainCategories.json',
		stub: [],
		parse: parseArtifact<string[]>
	},
	liquidationsTokenSymbols: {
		file: 'liquidationsTokenSymbols.json',
		stub: [],
		parse: parseArtifact<string[]>
	},
	emissionsProtocolsList: {
		file: 'emissionsProtocolsList.json',
		stub: [],
		parse: parseArtifact<string[]>
	},
	emissionsSupplyMetrics: {
		file: 'emissionsSupplyMetrics.json',
		stub: {},
		parse: parseArtifact<ProtocolEmissionSupplyMetricsMap>
	},
	emissionsHistoricalPrices: {
		file: 'emissionsHistoricalPrices.json',
		stub: {},
		parse: parseArtifact<IEmissionsHistoricalPrices>
	},
	cgExchangeIdentifiers: {
		file: 'cgExchangeIdentifiers.json',
		stub: [],
		parse: parseArtifact<string[]>
	},
	bridgeProtocolSlugs: {
		file: 'bridgeProtocolSlugs.json',
		stub: [],
		parse: parseArtifact<string[]>
	},
	bridgeChainSlugs: {
		file: 'bridgeChainSlugs.json',
		stub: [],
		parse: parseArtifact<string[]>
	},
	bridgeChainSlugToName: {
		file: 'bridgeChainSlugToName.json',
		stub: {},
		parse: parseArtifact<Record<string, string>>
	},
	protocolLlamaswapDataset: {
		file: 'llamaswap-protocols.json',
		stub: {},
		parse: parseArtifact<ProtocolLlamaswapMetadata>
	},
	narrativeCategories: {
		file: 'narrativeCategories.json',
		stub: { ids: [], nameById: {} },
		parse: parseArtifact<NarrativeCategoriesMetadata>
	},
	oracleRoutes: {
		file: 'oracleRoutes.json',
		stub: { oracleNameBySlug: {}, chainNameBySlug: {}, chainSlugsByOracleSlug: {} },
		parse: parseArtifact<OracleRoutesMetadata>
	},
	digitalAssetTreasuryRoutes: {
		file: 'digitalAssetTreasuryRoutes.json',
		stub: { assetSlugs: [], companySlugs: [] },
		parse: parseArtifact<DigitalAssetTreasuryRoutesMetadata>
	},
	stablecoinPeggedAssetSlugs: {
		file: 'stablecoinPeggedAssetSlugs.json',
		stub: [],
		parse: parseArtifact<string[]>
	}
})

export const METADATA_ARTIFACT_KEYS = Object.keys(METADATA_ARTIFACT_REGISTRY) as MetadataArtifactKey[]

export const METADATA_ARTIFACT_FILES = Object.fromEntries(
	METADATA_ARTIFACT_KEYS.map((key) => [key, METADATA_ARTIFACT_REGISTRY[key].file])
) as { readonly [Key in MetadataArtifactKey]: string }

export const METADATA_CI_STUBS = Object.fromEntries(
	METADATA_ARTIFACT_KEYS.map((key) => [key, METADATA_ARTIFACT_REGISTRY[key].stub])
) as CoreMetadataPayload

export function parseMetadataArtifact<Key extends MetadataArtifactKey>(
	key: Key,
	value: unknown
): CoreMetadataPayload[Key] {
	const artifact = METADATA_ARTIFACT_REGISTRY[key]
	return artifact.parse(value, artifact.file) as CoreMetadataPayload[Key]
}

export function getMetadataArtifactEntries(payload: CoreMetadataPayload): Array<[string, unknown]> {
	const entries: Array<[string, unknown]> = []
	for (const key of METADATA_ARTIFACT_KEYS) {
		entries.push([METADATA_ARTIFACT_REGISTRY[key].file, payload[key]])
	}
	return entries
}

export function createMetadataPayloadFromArtifacts(valuesByFile: Record<string, unknown>): CoreMetadataPayload {
	const payload = {} as CoreMetadataPayload
	const writablePayload = payload as Record<MetadataArtifactKey, unknown>
	for (const key of METADATA_ARTIFACT_KEYS) {
		const artifact = METADATA_ARTIFACT_REGISTRY[key]
		writablePayload[key] = artifact.parse(valuesByFile[artifact.file], artifact.file)
	}
	return payload
}

export function validateCoreMetadataPayload(payload: CoreMetadataPayload): CoreMetadataPayload {
	const validatedPayload = {} as CoreMetadataPayload
	const writablePayload = validatedPayload as Record<MetadataArtifactKey, unknown>
	for (const key of METADATA_ARTIFACT_KEYS) {
		writablePayload[key] = parseMetadataArtifact(key, payload[key])
	}
	return validatedPayload
}

export function hydrateMetadataCache(payload: CoreMetadataPayload): MetadataCache {
	return {
		chainMetadata: payload.chains,
		protocolMetadata: payload.protocols,
		categoriesAndTags: payload.categoriesAndTags,
		cexs: payload.cexs,
		rwaList: payload.rwaList,
		rwaPerpsList: payload.rwaPerpsList,
		tokenlist: payload.tokenlist,
		tokenDirectory: payload.tokenDirectory,
		protocolDisplayNames: createStringLookupMap(payload.protocolDisplayNames),
		chainDisplayNames: createChainDisplayNameMap(payload),
		chainCategories: payload.chainCategories,
		liquidationsTokenSymbols: payload.liquidationsTokenSymbols,
		liquidationsTokenSymbolsSet: new Set(payload.liquidationsTokenSymbols),
		emissionsProtocolsList: payload.emissionsProtocolsList,
		emissionsSupplyMetrics: payload.emissionsSupplyMetrics,
		emissionsHistoricalPrices: payload.emissionsHistoricalPrices,
		cgExchangeIdentifiers: payload.cgExchangeIdentifiers,
		bridgeProtocolSlugs: payload.bridgeProtocolSlugs,
		bridgeChainSlugs: payload.bridgeChainSlugs,
		bridgeChainSlugToName: payload.bridgeChainSlugToName,
		protocolLlamaswapDataset: payload.protocolLlamaswapDataset,
		narrativeCategories: payload.narrativeCategories,
		narrativeCategoryIdsSet: new Set(payload.narrativeCategories.ids),
		oracleRoutes: payload.oracleRoutes,
		digitalAssetTreasuryRoutes: payload.digitalAssetTreasuryRoutes,
		digitalAssetTreasuryAssetSlugsSet: new Set(payload.digitalAssetTreasuryRoutes.assetSlugs),
		digitalAssetTreasuryCompanySlugsSet: new Set(payload.digitalAssetTreasuryRoutes.companySlugs),
		stablecoinPeggedAssetSlugs: payload.stablecoinPeggedAssetSlugs,
		stablecoinPeggedAssetSlugsSet: new Set(payload.stablecoinPeggedAssetSlugs)
	}
}

export function createMetadataCacheFromArtifacts(payload: CoreMetadataPayload): MetadataCache {
	return hydrateMetadataCache(payload)
}

function createChainDisplayNameMap(payload: CoreMetadataPayload): Map<string, string> {
	return createStringLookupMap({
		...payload.chainDisplayNames,
		...buildChainDisplayNameLookupRecord(payload.chains)
	})
}

export function replaceMetadataCacheContents(metadataCache: MetadataCache, payload: CoreMetadataPayload): void {
	Object.assign(metadataCache, hydrateMetadataCache(payload))
}

export const applyMetadataRefresh = replaceMetadataCacheContents
