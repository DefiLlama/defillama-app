import { describe, expect, it, vi } from 'vitest'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

const metadataCache = vi.hoisted(
	(): MetadataCache => ({
		chainMetadata: {
			ethereum: { name: 'Ethereum', id: 'ethereum', stablecoins: true, fees: true }
		},
		protocolMetadata: {
			aave: { name: 'aave', displayName: 'Aave', tvl: true, fees: true, emissions: true },
			uniswap: { name: 'uniswap', displayName: 'Uniswap', dexs: true }
		},
		categoriesAndTags: { categories: ['Lending'], tags: [], tagCategoryMap: {}, configs: {} },
		cexs: [{ name: 'Binance', slug: 'binance' }],
		rwaList: {
			canonicalMarketIds: ['ondo/usdy'],
			platforms: ['Ondo'],
			chains: ['Ethereum'],
			categories: ['Treasuries'],
			assetGroups: ['US Treasury Bills'],
			idMap: {}
		},
		rwaPerpsList: { contracts: ['Gold Dec 2026'], venues: ['CME'], categories: [], assetGroups: [], total: 2 },
		tokenlist: {},
		tokenDirectory: {
			btc: { name: 'Bitcoin', symbol: 'BTC', route: 'token/btc' }
		},
		protocolDisplayNames: new Map(),
		chainDisplayNames: new Map(),
		chainCategories: [],
		liquidationsTokenSymbols: ['WETH'],
		liquidationsTokenSymbolsSet: new Set(['WETH']),
		emissionsProtocolsList: ['aave'],
		emissionsSupplyMetrics: {},
		emissionsHistoricalPrices: {},
		cgExchangeIdentifiers: [],
		bridgeProtocolSlugs: ['stargate'],
		bridgeChainSlugs: ['ethereum'],
		bridgeChainSlugToName: { ethereum: 'Ethereum' },
		protocolLlamaswapDataset: {},
		narrativeCategories: { ids: ['ai'], nameById: { ai: 'AI' } },
		narrativeCategoryIdsSet: new Set(['ai']),
		oracleRoutes: {
			oracleNameBySlug: { chainlink: 'Chainlink' },
			chainNameBySlug: { ethereum: 'Ethereum' },
			chainSlugsByOracleSlug: { chainlink: ['ethereum'] }
		},
		digitalAssetTreasuryRoutes: { assetSlugs: ['bitcoin'], companySlugs: ['mstr'] },
		digitalAssetTreasuryAssetSlugsSet: new Set(['bitcoin']),
		digitalAssetTreasuryCompanySlugsSet: new Set(['mstr']),
		stablecoinPeggedAssetSlugs: ['tether'],
		stablecoinPeggedAssetSlugsSet: new Set(['tether'])
	})
)

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: metadataCache
}))

vi.mock('~/server/datasetCache/liquidations', () => ({
	getLiquidationsProtocolsResponseFromCache: vi.fn().mockResolvedValue({ protocols: ['aave'] }),
	getLiquidationsProtocolChainIdsFromCache: vi.fn().mockResolvedValue(['ethereum'])
}))

vi.mock('~/server/datasetCache/raises', () => ({
	fetchRaisesFromCache: vi.fn().mockResolvedValue([
		{
			leadInvestors: ['Paradigm'],
			otherInvestors: ['a16z']
		}
	])
}))

import { buildAppSitemapSections, getSitemapSection, getSitemapSectionPath } from '~/server/routeCache/sitemap'

describe('cache-backed sitemap sections', () => {
	it('builds grouped public routes from metadata and dataset cache only', async () => {
		const sections = await buildAppSitemapSections()
		const entriesBySection = new Map(
			sections.map((section) => [section.id, section.entries.map((entry) => entry.path)])
		)

		expect(getSitemapSectionPath('protocols')).toBe('sitemap/protocols.xml')
		expect(entriesBySection.get('protocols')).toEqual(expect.arrayContaining(['protocol/aave', 'protocol/fees/aave']))
		expect(entriesBySection.get('chains')).toEqual(expect.arrayContaining(['chain/ethereum', 'fees/chain/ethereum']))
		expect(entriesBySection.get('stablecoins')).toEqual(
			expect.arrayContaining(['stablecoin/tether', 'stablecoins/ethereum'])
		)
		expect(entriesBySection.get('cexs')).toEqual(expect.arrayContaining(['cex/binance']))
		expect(entriesBySection.get('bridges')).toEqual(expect.arrayContaining(['bridge/stargate', 'bridges/ethereum']))
		expect(entriesBySection.get('dat')).toEqual(
			expect.arrayContaining(['digital-asset-treasury/mstr', 'digital-asset-treasuries/bitcoin'])
		)
		expect(entriesBySection.get('liquidations')).toEqual(
			expect.arrayContaining(['liquidations/aave', 'liquidations/aave/ethereum'])
		)
		expect(entriesBySection.get('liquidations')).not.toContain('liquidations/token/WETH')
		expect(entriesBySection.get('raises')).toEqual(expect.arrayContaining(['raises/paradigm', 'raises/a16z']))
		expect(sections.map((section) => String(section.id))).not.toContain('tokens')
		expect(entriesBySection.get('narratives')).toEqual(expect.arrayContaining(['narrative-tracker/ai']))
	})

	it('resolves section ids from Next page params that include the .xml suffix', async () => {
		const section = await getSitemapSection('static.xml')

		expect(section?.id).toBe('static')
	})
})
