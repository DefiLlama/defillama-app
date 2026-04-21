import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RawRaise } from '~/containers/Raises/api.types'
import type { RawTreasuriesResponse } from '~/containers/Treasuries/api.types'
import type { IProtocolMetadata, ITokenListEntry } from '~/utils/metadata/types'
import type { TokenDirectoryRecord } from '~/utils/tokenDirectory'
import {
	buildDisplayedTokenChartData,
	buildTokenOverviewRawChartData,
	type TokenOverviewData,
	getTokenOverviewData
} from './tokenOverview'
import { TokenOverviewSection } from './TokenOverviewSection'

const mocks = vi.hoisted(() => ({
	fetchCoinGeckoChartByIdWithCacheFallback: vi.fn(),
	fetchCoinGeckoCoinById: vi.fn(),
	fetchCoinPriceByCoinGeckoIdViaLlamaPrices: vi.fn(),
	fetchProtocolOverviewMetrics: vi.fn(),
	fetchRaises: vi.fn(),
	fetchTreasuries: vi.fn(),
	fetchProtocolEmissionFromDatasets: vi.fn(),
	fetchLiquidityTokensDataset: vi.fn(),
	fetchJson: vi.fn(),
	useFetchTokenOverviewChartData: vi.fn()
}))

let routerState = {
	pathname: '/token/[token]',
	query: {} as Record<string, string | string[]>,
	push: vi.fn()
}
let lastProtocolChartProps: any = null

vi.mock('next/router', () => ({
	useRouter: () => routerState
}))

vi.mock('~/api/coingecko', () => ({
	fetchCoinGeckoChartByIdWithCacheFallback: mocks.fetchCoinGeckoChartByIdWithCacheFallback,
	fetchCoinGeckoCoinById: mocks.fetchCoinGeckoCoinById,
	fetchCoinPriceByCoinGeckoIdViaLlamaPrices: mocks.fetchCoinPriceByCoinGeckoIdViaLlamaPrices
}))

vi.mock('~/containers/ProtocolOverview/api', () => ({
	fetchProtocolOverviewMetrics: mocks.fetchProtocolOverviewMetrics
}))

vi.mock('~/containers/Raises/api', () => ({
	fetchRaises: mocks.fetchRaises
}))

vi.mock('~/containers/Treasuries/api', () => ({
	fetchTreasuries: mocks.fetchTreasuries
}))

vi.mock('~/containers/Unlocks/api', () => ({
	fetchProtocolEmissionFromDatasets: mocks.fetchProtocolEmissionFromDatasets
}))

vi.mock('~/api', () => ({
	fetchLiquidityTokensDataset: mocks.fetchLiquidityTokensDataset
}))

vi.mock('~/utils/async', () => ({
	fetchJson: mocks.fetchJson
}))

vi.mock('./useFetchTokenOverviewChartData', () => ({
	useFetchTokenOverviewChartData: mocks.useFetchTokenOverviewChartData
}))

vi.mock('~/containers/ProtocolOverview/Chart', () => ({
	default: (props: any) => {
		lastProtocolChartProps = props
		return <div>protocol-chart</div>
	}
}))

const tokenEntryFixture: ITokenListEntry = {
	symbol: 'btc',
	current_price: 100,
	price_change_24h: 5,
	price_change_percentage_24h: 5,
	ath: 120,
	ath_date: '2024-01-01',
	atl: 1,
	atl_date: '2020-01-01',
	market_cap: 1000,
	fully_diluted_valuation: 1500,
	total_volume: 500,
	total_supply: 1000,
	circulating_supply: 21,
	max_supply: 21000
}

const protocolMetadataFixture = {
	name: 'test-protocol',
	displayName: 'Test Protocol',
	liquidity: true,
	emissions: true
} as IProtocolMetadata

const cgChartFixture = {
	data: {
		prices: [
			[1711929600000, 100],
			[1712016000000, 110]
		],
		mcaps: [
			[1711929600000, 1000],
			[1712016000000, 1100]
		],
		volumes: [
			[1711929600000, 450],
			[1712016000000, 500]
		],
		coinData: {
			tickers: [
				{
					trust_score: 'green',
					converted_volume: { usd: 300 },
					market: { identifier: 'binance' }
				},
				{
					trust_score: 'green',
					converted_volume: { usd: 200 },
					market: { identifier: 'uniswap' }
				}
			]
		}
	}
}

const cgCoinDetailFixture = {
	id: 'bitcoin',
	symbol: 'btc',
	name: 'Bitcoin',
	image: {
		small: 'https://example.com/btc.png'
	},
	market_data: {
		current_price: { usd: 123 },
		market_cap: { usd: 2222 },
		fully_diluted_valuation: { usd: 3333 },
		total_volume: { usd: 4444 },
		circulating_supply: 21,
		total_supply: 1000,
		max_supply: 21000,
		ath: { usd: 150 },
		ath_date: { usd: '2024-02-01' },
		atl: { usd: 1 },
		atl_date: { usd: '2020-01-01' }
	}
}

const overviewFixture: TokenOverviewData = {
	name: 'Bitcoin',
	displayName: 'BTC',
	symbol: 'BTC',
	llamaswapChains: [
		{
			chain: 'ethereum',
			address: '0x0000000000000000000000000000000000000000',
			displayName: 'Ethereum'
		}
	],
	marketData: {
		currentPrice: 100,
		percentChange24h: 5,
		ath: 120,
		athDate: '2024-01-01',
		atl: 1,
		atlDate: '2020-01-01',
		circulatingSupply: 21,
		totalSupply: 1000,
		maxSupply: 21000,
		mcap: 1000,
		fdv: 1500,
		volume24h: {
			total: 500,
			cex: 300,
			dex: 200
		}
	},
	treasury: {
		majors: 10,
		stablecoins: 20,
		ownTokens: 30,
		others: 40,
		total: 100
	},
	raises: [
		{
			date: 1704067200,
			round: 'Series A',
			amount: 50,
			source: 'Blog',
			investors: ['Investor A']
		}
	],
	tokenLiquidity: {
		total: 75,
		pools: [['Pool One', 'Ethereum', 75]]
	},
	outstandingFDV: 900,
	rawChartData: {
		'Token Price': [
			[1711929600000, 100],
			[1712016000000, 110]
		]
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	routerState = {
		pathname: '/token/[token]',
		query: {},
		push: vi.fn()
	}
	lastProtocolChartProps = null
	mocks.fetchCoinGeckoChartByIdWithCacheFallback.mockResolvedValue(cgChartFixture)
	mocks.fetchCoinGeckoCoinById.mockResolvedValue(cgCoinDetailFixture)
	mocks.fetchCoinPriceByCoinGeckoIdViaLlamaPrices.mockResolvedValue({
		price: 111,
		symbol: 'BTC',
		confidence: 0.99,
		timestamp: 1712016000
	})
	mocks.fetchProtocolOverviewMetrics.mockResolvedValue({ id: 'proto-data' })
	mocks.fetchRaises.mockResolvedValue({
		raises: [
			{
				date: 1704067200,
				name: 'Chain Raise',
				round: 'Strategic',
				amount: 25,
				chains: [],
				sector: '',
				category: '',
				categoryGroup: '',
				source: 'Chain Announcement',
				leadInvestors: ['Investor A'],
				otherInvestors: [],
				valuation: null,
				defillamaId: 'chain#xion'
			},
			{
				date: 1706745600,
				name: 'Protocol Raise',
				round: 'Series A',
				amount: 50,
				chains: [],
				sector: '',
				category: '',
				categoryGroup: '',
				source: 'Protocol Blog',
				leadInvestors: ['Investor B'],
				otherInvestors: [],
				valuation: null,
				defillamaId: 'parent#test-protocol'
			}
		] satisfies RawRaise[]
	})
	mocks.fetchTreasuries.mockResolvedValue([
		{
			id: 'parent#test-protocol-treasury',
			name: 'Treasury',
			address: null,
			symbol: 'TRE',
			url: '',
			description: '',
			chain: 'Ethereum',
			logo: '',
			audits: '',
			gecko_id: null,
			cmcId: null,
			category: 'treasury',
			chains: [],
			module: '',
			treasury: '',
			twitter: '',
			slug: '',
			tvl: 0,
			change_1h: null,
			change_1d: null,
			change_7d: null,
			tokenBreakdowns: {
				majors: 10,
				stablecoins: 20,
				ownTokens: 30,
				others: 40
			},
			mcap: null
		}
	] satisfies RawTreasuriesResponse)
	mocks.fetchProtocolEmissionFromDatasets.mockResolvedValue({
		supplyMetrics: {
			adjustedSupply: 900
		}
	})
	mocks.fetchLiquidityTokensDataset.mockResolvedValue([
		{
			id: 'proto-data',
			tokenPools: [
				{ project: 'pool-one', chain: 'Ethereum', tvlUsd: 50 },
				{ project: 'pool-two', chain: 'Base', tvlUsd: 25 }
			]
		}
	])
	mocks.fetchJson.mockImplementation((url: string) => {
		if (url.includes('/supply/')) {
			return Promise.resolve({ data: { total_supply: 1000 } })
		}

		return Promise.resolve({
			protocols: {
				'pool-one': { name: 'Pool One' },
				'pool-two': { name: 'Pool Two' }
			}
		})
	})
	mocks.useFetchTokenOverviewChartData.mockImplementation(({ overview }: { overview: TokenOverviewData }) => ({
		rawChartData: overview.rawChartData,
		isLoading: false
	}))
})

describe('tokenOverview helpers', () => {
	it('uses chain-based raises and skips treasury when chainId exists', async () => {
		const result = await getTokenOverviewData({
			record: {
				name: 'Xion',
				symbol: 'XION',
				chainId: 'xion',
				protocolId: 'parent#test-protocol'
			} satisfies TokenDirectoryRecord,
			displayName: 'XION',
			geckoId: 'bitcoin',
			tokenEntry: tokenEntryFixture,
			protocolMetadata: protocolMetadataFixture,
			cgExchangeIdentifiers: ['binance'],
			llamaswapChains: null
		})

		expect(result.treasury).toBeNull()
		expect(result.raises).toEqual([
			expect.objectContaining({
				round: 'Strategic',
				amount: 25,
				source: 'Chain Announcement'
			})
		])
		expect(result.marketData.volume24h).toEqual({
			total: 500,
			cex: 300,
			dex: 200
		})
		expect(result.llamaswapChains).toBeNull()
		expect(result.outstandingFDV).toBe(90000)
		expect(mocks.fetchTreasuries).not.toHaveBeenCalled()
	})

	it('fetches treasury by protocol when protocolId exists without chainId', async () => {
		const result = await getTokenOverviewData({
			record: {
				name: 'Test Protocol',
				symbol: 'TEST',
				protocolId: 'parent#test-protocol'
			} satisfies TokenDirectoryRecord,
			displayName: 'TEST',
			geckoId: 'bitcoin',
			tokenEntry: tokenEntryFixture,
			protocolMetadata: protocolMetadataFixture,
			cgExchangeIdentifiers: ['binance'],
			llamaswapChains: overviewFixture.llamaswapChains
		})

		expect(result.treasury).toEqual({
			majors: 10,
			stablecoins: 20,
			ownTokens: 30,
			others: 40,
			total: 100
		})
		expect(result.llamaswapChains).toEqual(overviewFixture.llamaswapChains)
		expect(result.raises).toEqual([
			expect.objectContaining({
				round: 'Series A',
				amount: 50
			})
		])
		expect(mocks.fetchTreasuries).toHaveBeenCalledOnce()
	})

	it('prefers the protocol slug metadata and max supply when building overview data', async () => {
		const result = await getTokenOverviewData({
			record: {
				name: 'Test Protocol',
				symbol: 'TEST',
				protocolId: 'parent#uniswap'
			} satisfies TokenDirectoryRecord,
			displayName: 'TEST',
			geckoId: 'bitcoin',
			tokenEntry: {
				...tokenEntryFixture,
				max_supply: 21000,
				total_supply: 1000
			},
			protocolMetadata: {
				...protocolMetadataFixture,
				name: 'uniswap-v3',
				displayName: 'Uniswap'
			} as IProtocolMetadata,
			cgExchangeIdentifiers: ['binance'],
			llamaswapChains: null
		})

		expect(mocks.fetchProtocolOverviewMetrics).toHaveBeenCalledWith('uniswap')
		expect(mocks.fetchProtocolEmissionFromDatasets).toHaveBeenCalledWith('uniswap')
		expect(result.rawChartData.FDV).toEqual([
			[1711929600000, 2100000],
			[1712016000000, 2310000]
		])
	})

	it('can limit server-prefetched chart data to only the default price series', async () => {
		const result = await getTokenOverviewData({
			record: {
				name: 'Bitcoin',
				symbol: 'BTC'
			} satisfies TokenDirectoryRecord,
			displayName: 'BTC',
			geckoId: 'bitcoin',
			tokenEntry: tokenEntryFixture,
			protocolMetadata: null,
			cgExchangeIdentifiers: ['binance'],
			llamaswapChains: null,
			prefetchedCharts: ['Token Price']
		})

		expect(result.rawChartData).toEqual({
			'Token Price': [
				[1711929600000, 100],
				[1712016000000, 110]
			]
		})
	})

	it('keeps liquidity rows when yields metadata is missing a protocol display name', async () => {
		mocks.fetchJson.mockImplementation((url: string) => {
			if (url.includes('/supply/')) {
				return Promise.resolve({ data: { total_supply: 1000 } })
			}

			return Promise.resolve({
				protocols: {
					'pool-one': {}
				}
			})
		})

		const result = await getTokenOverviewData({
			record: {
				name: 'Test Protocol',
				symbol: 'TEST',
				protocolId: 'parent#test-protocol'
			} satisfies TokenDirectoryRecord,
			displayName: 'TEST',
			geckoId: 'bitcoin',
			tokenEntry: tokenEntryFixture,
			protocolMetadata: protocolMetadataFixture,
			cgExchangeIdentifiers: ['binance'],
			llamaswapChains: null
		})

		expect(result.tokenLiquidity).toEqual({
			total: 75,
			pools: [
				['pool-one', 'Ethereum', 50],
				['pool-two', 'Base', 25]
			]
		})
	})

	it('returns token-only data when no protocol mapping is available', async () => {
		const result = await getTokenOverviewData({
			record: {
				name: 'Bitcoin',
				symbol: 'BTC'
			} satisfies TokenDirectoryRecord,
			displayName: 'BTC',
			geckoId: 'bitcoin',
			tokenEntry: tokenEntryFixture,
			protocolMetadata: null,
			cgExchangeIdentifiers: ['binance'],
			llamaswapChains: null
		})

		expect(result.marketData.currentPrice).toBe(100)
		expect(result.treasury).toBeNull()
		expect(result.raises).toBeNull()
		expect(result.tokenLiquidity).toBeNull()
		expect(result.outstandingFDV).toBeNull()
		expect(result.llamaswapChains).toBeNull()
		expect(result.logoUrl).toBe('https://example.com/btc.png')
		expect(mocks.fetchCoinGeckoCoinById).toHaveBeenCalledWith('bitcoin', {
			localization: false,
			tickers: false,
			marketData: false,
			communityData: false,
			developerData: false,
			sparkline: false,
			includeCategoriesDetails: false
		})
		expect(mocks.fetchCoinPriceByCoinGeckoIdViaLlamaPrices).not.toHaveBeenCalled()
	})

	it('fetches only logo detail when only max supply is missing from tokenlist data', async () => {
		mocks.fetchCoinGeckoCoinById.mockResolvedValueOnce({
			id: 'ethereum',
			symbol: 'eth',
			name: 'Ethereum',
			image: {
				small: 'https://example.com/eth.png'
			}
		})

		const result = await getTokenOverviewData({
			record: {
				name: 'Ethereum',
				symbol: 'ETH'
			} satisfies TokenDirectoryRecord,
			displayName: 'ETH',
			geckoId: 'ethereum',
			tokenEntry: {
				...tokenEntryFixture,
				max_supply: null
			},
			protocolMetadata: null,
			cgExchangeIdentifiers: ['binance'],
			llamaswapChains: null
		})

		expect(result.marketData.currentPrice).toBe(100)
		expect(result.marketData.maxSupply).toBeNull()
		expect(result.logoUrl).toBe('https://example.com/eth.png')
		expect(mocks.fetchCoinGeckoCoinById).toHaveBeenCalledWith('ethereum', {
			localization: false,
			tickers: false,
			marketData: false,
			communityData: false,
			developerData: false,
			sparkline: false,
			includeCategoriesDetails: false
		})
		expect(mocks.fetchCoinPriceByCoinGeckoIdViaLlamaPrices).not.toHaveBeenCalled()
	})

	it('falls back to the single-price endpoint when tokenlist market data is missing', async () => {
		const result = await getTokenOverviewData({
			record: {
				name: 'Wrapped stETH',
				symbol: 'WSTETH'
			} satisfies TokenDirectoryRecord,
			displayName: 'WSTETH',
			geckoId: 'wrapped-steth',
			tokenEntry: null,
			protocolMetadata: null,
			cgExchangeIdentifiers: ['binance'],
			llamaswapChains: null
		})

		expect(result.marketData.currentPrice).toBe(123)
		expect(result.marketData.mcap).toBe(2222)
		expect(result.marketData.fdv).toBe(3333)
		expect(result.marketData.volume24h.total).toBe(4444)
		expect(result.logoUrl).toBe('https://example.com/btc.png')
		expect(mocks.fetchCoinGeckoCoinById).toHaveBeenCalledWith('wrapped-steth', expect.any(Object))
		expect(mocks.fetchCoinPriceByCoinGeckoIdViaLlamaPrices).toHaveBeenCalledWith('wrapped-steth')
		expect(result.rawChartData['Token Price']).toEqual([
			[1711929600000, 100],
			[1712016000000, 110]
		])
	})

	it('builds token volume chart data from the coingecko chart payload', () => {
		const rawChartData = buildTokenOverviewRawChartData({
			chart: cgChartFixture as any,
			totalSupply: 1000
		})

		expect(rawChartData['Token Volume']).toEqual([
			[1711929600000, 450],
			[1712016000000, 500]
		])
	})

	it('shows only the default price chart when optional charts are not enabled', () => {
		const displayed = buildDisplayedTokenChartData({
			rawChartData: {
				'Token Price': [
					[1711929600000, 100],
					[1712016000000, 110]
				],
				'Token Volume': [
					[1711929600000, 450],
					[1712016000000, 500]
				],
				Mcap: [
					[1711929600000, 1000],
					[1712016000000, 1100]
				],
				FDV: [
					[1711929600000, 1500],
					[1712016000000, 1600]
				]
			},
			activeCharts: ['Token Price'],
			groupBy: 'daily'
		})

		expect(Object.keys(displayed)).toEqual(['Token Price'])
	})

	it('supports non-price chart combinations when toggled on', () => {
		const displayed = buildDisplayedTokenChartData({
			rawChartData: {
				'Token Price': [
					[1711929600000, 100],
					[1712016000000, 110]
				],
				'Token Volume': [
					[1711929600000, 450],
					[1712016000000, 500]
				],
				Mcap: [
					[1711929600000, 1000],
					[1712016000000, 1100]
				],
				FDV: [
					[1711929600000, 1500],
					[1712016000000, 1600]
				]
			},
			activeCharts: ['Token Volume', 'Mcap', 'FDV'],
			groupBy: 'daily'
		})

		expect(Object.keys(displayed)).toEqual(['Token Volume', 'Mcap', 'FDV'])
	})
})

describe('TokenOverviewSection component', () => {
	it('renders nested price and volume breakdown metrics', () => {
		const html = renderToStaticMarkup(<TokenOverviewSection overview={overviewFixture} geckoId="bitcoin" />)

		expect(html).toContain('All Time High')
		expect(html).toContain('All Time Low')
		expect(html).toContain('Token Price')
		expect(html).toContain('Buy Now')
		expect(html).toContain('Add Metrics')
		expect(html).toContain('$BTC Price')
		expect(html).toContain('CEX Volume')
		expect(html).toContain('DEX Volume')
		expect(html).toContain('Sum of value locked in DEX pools that include that token')
		expect(html).toContain('protocol-chart')
		expect(html.indexOf('Market Cap')).toBeLessThan(html.indexOf('Circ. Supply'))
		expect(html.indexOf('Fully Diluted Valuation')).toBeLessThan(html.indexOf('Circ. Supply'))
	})

	it('shows undisclosed raises without falling back to $0 and exposes chart controls to assistive tech', () => {
		const html = renderToStaticMarkup(
			<TokenOverviewSection
				overview={{
					...overviewFixture,
					raises: [
						{
							date: 1704067200,
							round: 'Series A',
							amount: null,
							source: 'Blog',
							investors: ['Investor A']
						}
					]
				}}
				geckoId="bitcoin"
			/>
		)

		expect(html).toContain('Undisclosed')
		expect(html).not.toContain('>$0<')
		expect(html).toContain('aria-label="Remove $BTC Price"')
	})

	it('waits for the client before rendering bookmarked non-prefetched charts', () => {
		routerState.query = {
			chartGroup: 'weekly',
			chart: 'Token Volume'
		}

		const html = renderToStaticMarkup(<TokenOverviewSection overview={overviewFixture} geckoId="bitcoin" />)

		expect(html).not.toContain('fetching $BTC Volume')
		expect(html).not.toContain('Chart unavailable for this token right now.')
	})

	it('renders client-fetched non-price chart combinations when the chart hook returns them', () => {
		routerState.query = {
			chartGroup: 'weekly',
			chart: 'Token Volume'
		}
		mocks.useFetchTokenOverviewChartData.mockReturnValue({
			rawChartData: {
				...overviewFixture.rawChartData,
				'Token Volume': [
					[1711929600000, 450],
					[1712016000000, 500]
				]
			},
			isLoading: false
		})

		renderToStaticMarkup(<TokenOverviewSection overview={overviewFixture} geckoId="bitcoin" />)

		expect(lastProtocolChartProps.groupBy).toBe('weekly')
		expect(Object.keys(lastProtocolChartProps.chartData)).toEqual(['Token Volume'])
	})

	it('shows a graceful fallback when market chart data is unavailable', () => {
		const html = renderToStaticMarkup(
			<TokenOverviewSection
				overview={{
					...overviewFixture,
					rawChartData: {}
				}}
				geckoId={null}
			/>
		)

		expect(html).toContain('Chart unavailable without CoinGecko market data.')
	})
})
