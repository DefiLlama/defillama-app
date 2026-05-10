import { describe, expect, it } from 'vitest'
import {
	METADATA_ARTIFACT_FILES,
	METADATA_CI_STUBS,
	applyMetadataRefresh,
	createMetadataCacheFromArtifacts,
	getMetadataArtifactEntries,
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
		liquidationsTokenSymbols: ['ETH'],
		emissionsProtocolsList: ['aave'],
		cgExchangeIdentifiers: ['binance'],
		bridgeProtocolSlugs: ['stargate'],
		bridgeChainSlugs: ['ethereum'],
		bridgeChainSlugToName: { ethereum: 'Ethereum' },
		protocolLlamaswapDataset: {},
		...overrides
	}
}

describe('metadata artifact contract', () => {
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
		expect(metadata.liquidationsTokenSymbolsSet.has('ETH')).toBe(true)
	})

	it('applies refresh payloads directly', () => {
		const metadata = createMetadataCacheFromArtifacts(createPayload())

		applyMetadataRefresh(
			metadata,
			createPayload({
				protocols: {},
				protocolDisplayNames: {},
				tokenDirectory: {},
				tokenlist: {}
			})
		)

		expect(metadata.protocolMetadata).toEqual({})
		expect(metadata.protocolDisplayNames.size).toBe(0)
		expect(metadata.tokenDirectory).toEqual({})
		expect(metadata.tokenlist).toEqual({})
	})
})
