import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
		rwaPerpsList: {
			contracts: ['Gold Dec 2026'],
			venues: ['CME'],
			categories: ['RWA Perps'],
			assetGroups: [],
			total: 2
		},
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

vi.mock('~/containers/LiquidationsV2/server/dataset.cache', () => ({
	getLiquidationsProtocolsResponseFromCache: vi.fn().mockResolvedValue({ protocols: ['aave'] }),
	getLiquidationsProtocolChainIdsFromCache: vi.fn().mockResolvedValue(['ethereum'])
}))

vi.mock('~/containers/Cexs/server/dataset.markets.cache', () => ({
	fetchExchangeMarketsListFromCache: vi.fn().mockResolvedValue({
		cex: {
			spot: [{ defillama_slug: 'Binance', exchange: 'binance', market_count: 1, total_volume_24h: 1 }],
			linear_perp: [],
			inverse_perp: []
		}
	})
}))

vi.mock('~/containers/Raises/server/dataset.cache', () => ({
	fetchRaisesFromCache: vi.fn().mockResolvedValue([
		{
			leadInvestors: ['Paradigm'],
			otherInvestors: ['a16z']
		}
	])
}))

import { buildAppSitemapSections, getSitemapSection, getSitemapSectionPath } from '~/server/routeCache/sitemap'

beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input)
			if (url.includes('/dashboards/search')) {
				return new Response(
					JSON.stringify({
						items: [
							{
								id: 'empty-public-dashboard',
								visibility: 'public',
								updated: '2026-01-02T00:00:00.000Z'
							},
							{
								id: 'rich-public-dashboard',
								visibility: 'public',
								editedAt: '2026-01-03T00:00:00.000Z'
							}
						],
						totalPages: 1
					}),
					{ status: 200 }
				)
			}

			return new Response('{}', { status: 404 })
		})
	)
})

afterEach(() => {
	vi.useRealTimers()
	vi.clearAllMocks()
})

describe('cache-backed sitemap sections', () => {
	it('builds grouped public routes from metadata and dataset cache only', async () => {
		const sections = await buildAppSitemapSections()
		const entriesBySection = new Map(
			sections.map((section) => [section.id, section.entries.map((entry) => entry.path)])
		)
		const allEntryPaths = sections.flatMap((section) => section.entries.map((entry) => entry.path))

		expect(getSitemapSectionPath('protocols')).toBe('sitemap/protocols.xml')
		expect(entriesBySection.get('protocols')).toEqual(expect.arrayContaining(['protocol/aave', 'protocol/fees/aave']))
		expect(entriesBySection.get('chains')).toEqual(expect.arrayContaining(['chain/ethereum', 'fees/chain/ethereum']))
		expect(entriesBySection.get('stablecoins')).toEqual(
			expect.arrayContaining(['stablecoin/tether', 'stablecoins/ethereum'])
		)
		expect(entriesBySection.get('cexs')).toEqual(
			expect.arrayContaining(['cex/binance', 'cex/assets/binance', 'cex/stablecoins/binance', 'cex/markets/binance'])
		)
		expect(entriesBySection.get('bridges')).toEqual(expect.arrayContaining(['bridge/stargate', 'bridges/ethereum']))
		expect(getSitemapSectionPath('protocols-by-category')).toBe('sitemap/protocols-by-category.xml')
		expect(entriesBySection.get('dat')).toEqual(
			expect.arrayContaining(['digital-asset-treasury/mstr', 'digital-asset-treasuries/bitcoin'])
		)
		expect(entriesBySection.get('rwa')).toEqual(expect.arrayContaining(['rwa/perps/forex']))
		expect(entriesBySection.get('rwa')).not.toContain('rwa/perps/category/rwa-perps')
		expect(entriesBySection.get('liquidations')).toEqual(
			expect.arrayContaining(['liquidations/aave', 'liquidations/aave/ethereum'])
		)
		expect(entriesBySection.get('liquidations')).not.toContain('liquidations/token/WETH')
		expect(new Set(allEntryPaths).size).toBe(allEntryPaths.length)
		expect(entriesBySection.get('raises')).toEqual(expect.arrayContaining(['raises/paradigm', 'raises/a16z']))
		expect(sections.map((section) => String(section.id))).not.toContain('tokens')
		expect(entriesBySection.get('narratives')).toEqual(expect.arrayContaining(['narrative-tracker/ai']))
		expect(getSitemapSectionPath('pro-dashboards')).toBe('sitemap/pro-dashboards.xml')
		expect(entriesBySection.get('pro-dashboards')).toEqual(
			expect.arrayContaining(['pro/empty-public-dashboard', 'pro/rich-public-dashboard'])
		)
		expect(sections.find((section) => section.id === 'pro-dashboards')?.entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: 'pro/empty-public-dashboard',
					lastmod: '2026-01-02T00:00:00.000Z'
				}),
				expect.objectContaining({
					path: 'pro/rich-public-dashboard',
					lastmod: '2026-01-03T00:00:00.000Z'
				})
			])
		)
		expect(vi.mocked(fetch)).toHaveBeenCalledWith(
			expect.stringContaining('visibility=public&sortBy=popular&page=1&limit=100'),
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		)
	})

	it('resolves section ids from Next page params that include the .xml suffix', async () => {
		const section = await getSitemapSection('static.xml')

		expect(section?.id).toBe('static')
	})

	it('serves the previous sitemap snapshot while an expired cache refresh fails', async () => {
		const { fetchExchangeMarketsListFromCache } = await import('~/containers/Cexs/server/dataset.markets.cache')
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		await buildAppSitemapSections()
		vi.useFakeTimers({ now: Date.now() + 60 * 60 * 1000 + 1 })
		vi.mocked(fetchExchangeMarketsListFromCache).mockRejectedValueOnce(new Error('refresh failed'))

		const section = await getSitemapSection('cexs.xml')

		expect(section?.entries.map((entry) => entry.path)).toEqual(
			expect.arrayContaining(['cex/binance', 'cex/markets/binance'])
		)
		await Promise.resolve()
		await Promise.resolve()
		warnSpy.mockRestore()
	})
})
