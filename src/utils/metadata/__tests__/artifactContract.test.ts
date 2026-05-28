import { describe, expect, it } from 'vitest'
import {
	METADATA_ARTIFACT_KEYS,
	METADATA_ARTIFACT_FILES,
	METADATA_ARTIFACT_REGISTRY,
	METADATA_CI_STUBS,
	applyMetadataRefresh,
	createMetadataCacheFromArtifacts,
	getMetadataArtifactEntries,
	validateCoreMetadataPayload,
	type CoreMetadataPayload
} from '../artifactContract'

const tokenEntry = {
	symbol: 'AAVE',
	current_price: null,
	price_change_24h: null,
	price_change_percentage_24h: null,
	ath: null,
	ath_date: null,
	atl: null,
	atl_date: null,
	market_cap: null,
	fully_diluted_valuation: null,
	total_volume: null,
	total_supply: null,
	circulating_supply: null,
	max_supply: null
}

function createPayload(overrides: Partial<CoreMetadataPayload> = {}): CoreMetadataPayload {
	return {
		protocols: { 'parent#aave': { name: 'aave', displayName: 'Aave', tvl: true } },
		chains: { Ethereum: { name: 'Ethereum', id: 'ethereum' } },
		categoriesAndTags: { categories: [], tags: [], tagCategoryMap: {}, configs: {} },
		cexs: [],
		rwaList: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} },
		rwaPerpsList: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 },
		tokenlist: { aave: tokenEntry },
		tokenDirectory: { aave: { name: 'Aave', symbol: 'AAVE' } },
		protocolDisplayNames: { aave: 'Aave' },
		chainDisplayNames: { ethereum: 'Ethereum' },
		chainCategories: ['EVM'],
		liquidationsTokenSymbols: ['ETH'],
		emissionsProtocolsList: ['aave'],
		emissionsSupplyMetrics: {},
		emissionsHistoricalPrices: {},
		cgExchangeIdentifiers: ['binance'],
		bridgeProtocolSlugs: ['stargate'],
		bridgeChainSlugs: ['ethereum'],
		bridgeChainSlugToName: { ethereum: 'Ethereum' },
		protocolLlamaswapDataset: {},
		narrativeCategories: { ids: ['ai'], nameById: { ai: 'AI' } },
		oracleRoutes: {
			oracleNameBySlug: { chainlink: 'Chainlink' },
			chainNameBySlug: { ethereum: 'Ethereum' },
			chainSlugsByOracleSlug: { chainlink: ['ethereum'] }
		},
		digitalAssetTreasuryRoutes: { assetSlugs: ['bitcoin'], companySlugs: ['mstr'] },
		stablecoinPeggedAssetSlugs: ['tether'],
		...overrides
	}
}

describe('metadata artifact contract', () => {
	it('declares a registry entry for every payload key', () => {
		expect(METADATA_ARTIFACT_KEYS.toSorted()).toEqual(Object.keys(createPayload()).toSorted())

		for (const key of METADATA_ARTIFACT_KEYS) {
			const artifact = METADATA_ARTIFACT_REGISTRY[key]
			expect(artifact.file).toMatch(/\.json$/)
			expect(artifact.file).not.toContain('..')
			expect(artifact.parse(artifact.stub, artifact.file)).toBe(artifact.stub)
		}
	})

	it('lists every generated artifact filename once', () => {
		const artifactFiles = Object.values(METADATA_ARTIFACT_FILES)
		expect(new Set(artifactFiles).size).toBe(artifactFiles.length)
		expect(
			getMetadataArtifactEntries(createPayload())
				.map(([file]) => file)
				.toSorted()
		).toEqual(artifactFiles.toSorted())
	})

	it('provides CI stubs for every generated artifact', () => {
		expect(
			getMetadataArtifactEntries(METADATA_CI_STUBS)
				.map(([file]) => file)
				.toSorted()
		).toEqual(Object.values(METADATA_ARTIFACT_FILES).toSorted())
	})

	it('creates runtime metadata lookups from artifact payloads', () => {
		const metadata = createMetadataCacheFromArtifacts(createPayload())

		expect(metadata.protocolMetadata['parent#aave'].displayName).toBe('Aave')
		expect(metadata.protocolDisplayNames.get('aave')).toBe('Aave')
		expect(metadata.chainDisplayNames.get('ethereum')).toBe('Ethereum')
		expect(metadata.chainCategories).toEqual(['EVM'])
		expect(metadata.liquidationsTokenSymbolsSet.has('ETH')).toBe(true)
		expect(metadata.narrativeCategoryIdsSet.has('ai')).toBe(true)
		expect(metadata.oracleRoutes.oracleNameBySlug.chainlink).toBe('Chainlink')
		expect(metadata.digitalAssetTreasuryAssetSlugsSet.has('bitcoin')).toBe(true)
		expect(metadata.digitalAssetTreasuryCompanySlugsSet.has('mstr')).toBe(true)
		expect(metadata.stablecoinPeggedAssetSlugsSet.has('tether')).toBe(true)
	})

	it('applies refresh payloads directly', () => {
		const metadata = createMetadataCacheFromArtifacts(createPayload())

		applyMetadataRefresh(
			metadata,
			createPayload({
				protocols: {},
				protocolDisplayNames: {},
				tokenDirectory: {},
				tokenlist: {},
				narrativeCategories: { ids: ['meme'], nameById: { meme: 'Meme' } },
				stablecoinPeggedAssetSlugs: ['usd-coin']
			})
		)

		expect(metadata.protocolMetadata).toEqual({})
		expect(metadata.protocolDisplayNames.size).toBe(0)
		expect(metadata.tokenDirectory).toEqual({})
		expect(metadata.tokenlist).toEqual({})
		expect(metadata.narrativeCategoryIdsSet.has('meme')).toBe(true)
		expect(metadata.stablecoinPeggedAssetSlugsSet.has('usd-coin')).toBe(true)
	})

	it('rebuilds chain display-name fallbacks during refresh', () => {
		const metadata = createMetadataCacheFromArtifacts(createPayload())

		applyMetadataRefresh(
			metadata,
			createPayload({
				chains: {
					Arbitrum: { name: 'Arbitrum One', id: 'arbitrum' }
				},
				chainDisplayNames: {}
			})
		)

		expect(metadata.chainDisplayNames.get('Arbitrum')).toBe('Arbitrum One')
		expect(metadata.chainDisplayNames.get('arbitrum-one')).toBe('Arbitrum One')
		expect(metadata.chainDisplayNames.get('arbitrum')).toBe('Arbitrum One')
	})

	it('allows smaller but valid refresh payloads', () => {
		const payload = createPayload({
			chains: {}
		})

		expect(validateCoreMetadataPayload(payload).chains).toEqual({})
	})

	it('accepts backend-owned artifact shapes without revalidating them', () => {
		const payload = createPayload({
			chains: [] as unknown as CoreMetadataPayload['chains']
		})

		expect(validateCoreMetadataPayload(payload).chains).toEqual([])
	})

	it('accepts nested backend-owned fields without revalidating them', () => {
		const payload = createPayload({
			tokenDirectory: {
				aave: { name: 'Aave' }
			} as unknown as CoreMetadataPayload['tokenDirectory'],
			categoriesAndTags: {
				categories: ['Lending'],
				tags: [1],
				tagCategoryMap: {},
				configs: {}
			} as unknown as CoreMetadataPayload['categoriesAndTags']
		})

		expect(validateCoreMetadataPayload(payload).tokenDirectory).toEqual({ aave: { name: 'Aave' } })
	})
})
