import { describe, expect, it } from 'vitest'
import { getCexSlugsFromMetadata, resolveCexParamFromMetadata } from '~/containers/Cexs/server/routes'
import {
	getChainMetricSlugsFromMetadata,
	getChainSlugsFromMetadata,
	resolveChainParamFromMetadata
} from '~/containers/ChainOverview/server/routes'
import {
	getProtocolFeatureSlugsFromMetadata,
	getProtocolOverviewSlugsFromMetadata,
	resolveProtocolParamFromMetadata
} from '~/containers/ProtocolOverview/server/routes'
import { getProtocolListingSlugsFromMetadata } from '~/containers/ProtocolTaxonomy/server/routes'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

function metadataFixture(): MetadataCache {
	return {
		chainMetadata: {
			ethereum: { name: 'Ethereum', id: 'ethereum', stablecoins: true, fees: true },
			'zkSync-era': { name: 'zkSync Era', id: 'era', stablecoins: true }
		},
		protocolMetadata: {
			aave: { name: 'aave', displayName: 'Aave V3', tvl: true, fees: true },
			uniswap: { name: 'uniswap-v3', displayName: 'Uniswap V3', tvl: true, dexs: true },
			bridge: { name: 'bridge', displayName: 'Bridge Child', tvl: true, category: 'Bridge' },
			child: { name: 'child-v2', displayName: 'Child V2', tvl: true, parentProtocol: 'parent#child' },
			nameless: { tvl: true }
		},
		categoriesAndTags: {
			categories: ['Dexs', 'Lending'],
			tags: ['Lending'],
			tagCategoryMap: { Lending: 'Lending' },
			configs: {}
		},
		cexs: [
			{ name: 'Binance', slug: 'binance' },
			{ name: 'Binance Alias', slug: 'Binance' }
		],
		rwaList: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} },
		rwaPerpsList: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 },
		tokenlist: {},
		tokenDirectory: {},
		protocolDisplayNames: new Map(),
		chainDisplayNames: new Map(),
		chainCategories: [],
		liquidationsTokenSymbols: [],
		liquidationsTokenSymbolsSet: new Set(),
		emissionsProtocolsList: [],
		emissionsSupplyMetrics: {},
		emissionsHistoricalPrices: {},
		cgExchangeIdentifiers: [],
		bridgeProtocolSlugs: [],
		bridgeChainSlugs: [],
		bridgeChainSlugToName: {},
		protocolLlamaswapDataset: {},
		narrativeCategories: { ids: [], nameById: {} },
		narrativeCategoryIdsSet: new Set(),
		oracleRoutes: { oracleNameBySlug: {}, chainNameBySlug: {}, chainSlugsByOracleSlug: {} },
		digitalAssetTreasuryRoutes: { assetSlugs: [], companySlugs: [] },
		digitalAssetTreasuryAssetSlugsSet: new Set(),
		digitalAssetTreasuryCompanySlugsSet: new Set(),
		stablecoinPeggedAssetSlugs: [],
		stablecoinPeggedAssetSlugsSet: new Set()
	}
}

describe('route cache readers', () => {
	it('resolves protocol params through display-name slugs first', () => {
		const route = resolveProtocolParamFromMetadata('Aave-V3', metadataFixture())

		expect(route).toEqual({
			id: 'aave',
			metadata: expect.objectContaining({ displayName: 'Aave V3' }),
			canonicalSlug: 'aave-v3'
		})
	})

	it('keeps protocol overview caps and route filters in cache-backed recipes', () => {
		const slugs = getProtocolOverviewSlugsFromMetadata(metadataFixture(), 10)

		expect(slugs).toEqual(['aave-v3', 'uniswap-v3', 'child'])
	})

	it('falls back to protocol slugs when parent protocol normalizes empty', () => {
		const metadata = metadataFixture()
		metadata.protocolMetadata.emptyParent = {
			name: 'empty-parent',
			displayName: 'Empty Parent',
			tvl: true,
			parentProtocol: 'parent#'
		}

		const slugs = getProtocolOverviewSlugsFromMetadata(metadata, 10)

		expect(slugs).toContain('empty-parent')
		expect(slugs).not.toContain('')
	})

	it('generates feature slugs from protocol metadata flags', () => {
		expect(getProtocolFeatureSlugsFromMetadata(metadataFixture(), (metadata) => Boolean(metadata.dexs))).toEqual([
			'uniswap-v3'
		])
	})

	it('resolves chain variants to canonical names', () => {
		const route = resolveChainParamFromMetadata('zksync era', metadataFixture())

		expect(route).toEqual({
			metadata: expect.objectContaining({ name: 'zkSync Era' }),
			canonicalSlug: 'zksync-era',
			canonicalName: 'zkSync Era'
		})
	})

	it('builds chain feature slugs from chain metadata flags', () => {
		const metadata = metadataFixture()

		expect(getChainSlugsFromMetadata(metadata)).toEqual(['ethereum', 'zksync-era'])
		expect(getChainMetricSlugsFromMetadata(metadata, 'fees')).toEqual(['ethereum'])
	})

	it('resolves CEX params through slug or display name', () => {
		const metadata = metadataFixture()

		expect(getCexSlugsFromMetadata(metadata)).toEqual(['binance'])
		expect(resolveCexParamFromMetadata('Binance', metadata)).toEqual({
			metadata: expect.objectContaining({ name: 'Binance' }),
			canonicalSlug: 'binance'
		})
	})

	it('dedupes protocol listing slugs from categories and tags', () => {
		expect(getProtocolListingSlugsFromMetadata(metadataFixture())).toEqual(['lending'])
	})
})
