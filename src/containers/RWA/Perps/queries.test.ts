import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toRWAPerpsBreakdownChartDataset } from './breakdownDataset'
import {
	appendRWAPerpsTimeSeriesDatasetTotal,
	buildRWAPerpsAssetGroupSnapshotBreakdownTotals,
	buildRWAPerpsOverviewSnapshotBreakdownTotals,
	buildRWAPerpsVenueSnapshotBreakdownTotals,
	groupRWAPerpsTimeSeriesDataset,
	hasEnoughTimeSeriesHistory,
	getRWAPerpsAssetGroupPage,
	getRWAPerpsAssetGroupsOverview,
	getRWAPerpsBreakdownChartDataset,
	getRWAPerpsContractBreakdownChartDataset,
	getRWAPerpsContractData,
	getRWAPerpsOverview,
	getRWAPerpsVenuePage,
	getRWAPerpsVenuesOverview
} from './queries'
import { buildRWAPerpsTreemapTreeData } from './treemap'

const {
	fetchRWAPerpsContractBreakdownChartData,
	fetchRWAPerpsMarketsByContract,
	fetchRWAPerpsMarketChart,
	fetchRWAPerpsFundingHistory,
	fetchRWAPerpsOverviewBreakdownChartData,
	fetchRWAPerpsStats,
	fetchRWAPerpsCurrent,
	fetchRWAPerpsList,
	fetchRWAPerpsMarketsByAssetGroup,
	fetchRWAPerpsMarketsByVenue
} = vi.hoisted(() => ({
	fetchRWAPerpsContractBreakdownChartData: vi.fn(),
	fetchRWAPerpsMarketsByContract: vi.fn(),
	fetchRWAPerpsMarketChart: vi.fn(),
	fetchRWAPerpsFundingHistory: vi.fn(),
	fetchRWAPerpsOverviewBreakdownChartData: vi.fn(),
	fetchRWAPerpsStats: vi.fn(),
	fetchRWAPerpsCurrent: vi.fn(),
	fetchRWAPerpsList: vi.fn(),
	fetchRWAPerpsMarketsByAssetGroup: vi.fn(),
	fetchRWAPerpsMarketsByVenue: vi.fn()
}))

vi.mock('./api', () => ({
	fetchRWAPerpsContractBreakdownChartData,
	fetchRWAPerpsMarketsByContract,
	fetchRWAPerpsMarketChart,
	fetchRWAPerpsFundingHistory,
	fetchRWAPerpsOverviewBreakdownChartData,
	fetchRWAPerpsStats,
	fetchRWAPerpsCurrent,
	fetchRWAPerpsList,
	fetchRWAPerpsMarketsByAssetGroup,
	fetchRWAPerpsMarketsByVenue
}))

const baseMarket = {
	timestamp: 1775011512,
	contract: 'xyz:META',
	venue: 'xyz',
	openInterest: 100,
	openInterestChange24h: 25,
	volume24h: 50,
	volume24hChange24h: 50,
	price: 500,
	priceChange24h: 5,
	fundingRate: 0.00001,
	premium: 0.0002,
	cumulativeFunding: 10,
	referenceAsset: 'Meta',
	referenceAssetGroup: 'Equities',
	assetClass: ['Stock Perp'],
	parentPlatform: 'trade[XYZ]',
	pair: null,
	marginAsset: 'USDC',
	settlementAsset: 'USDC',
	category: ['RWA Perps'],
	issuer: 'XYZ',
	website: ['https://trade.xyz/'],
	oracleProvider: 'Pyth equity feed',
	description: 'Perpetual market',
	accessModel: 'Permissionless',
	rwaClassification: 'Programmable Finance',
	makerFeeRate: 0.0002,
	takerFeeRate: 0.0005,
	deployerFeeShare: 0.5,
	oraclePx: 501,
	midPx: 500.5,
	prevDayPx: 480,
	maxLeverage: 10,
	szDecimals: 2,
	volume7d: 300,
	volume30d: 1000,
	volumeAllTime: 5000,
	estimatedProtocolFees24h: 1,
	estimatedProtocolFees7d: 3,
	estimatedProtocolFees30d: 10,
	estimatedProtocolFeesAllTime: 50
}

afterEach(() => {
	vi.clearAllMocks()
	vi.useRealTimers()
})

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-03-27T12:00:00Z'))
	fetchRWAPerpsList.mockResolvedValue({
		contracts: ['xyz:META', 'flx:GOLD'],
		venues: ['xyz', 'flx'],
		categories: ['RWA Perps', 'Gold & Commodities'],
		assetGroups: ['Commodities', 'Equities'],
		total: 2
	})
	fetchRWAPerpsStats.mockResolvedValue({
		totalMarkets: 3,
		totalOpenInterest: 350,
		totalVolume24h: 200,
		totalCumulativeFunding: 111,
		byVenue: {
			xyz: { openInterest: 250, volume24h: 160, markets: 2 },
			flx: { openInterest: 100, volume24h: 40, markets: 1 }
		},
		byCategory: {
			'RWA Perps': { openInterest: 300, volume24h: 170, markets: 2 },
			'Gold & Commodities': { openInterest: 50, volume24h: 30, markets: 1 }
		},
		byAssetGroup: {
			Equities: { openInterest: 250, volume24h: 160, markets: 2 },
			Commodities: { openInterest: 100, volume24h: 40, markets: 1 }
		},
		lastUpdated: '2026-04-01T00:00:00.000Z'
	})
	fetchRWAPerpsCurrent.mockResolvedValue([
		{
			...baseMarket,
			id: 'flx:gold',
			contract: 'flx:GOLD',
			venue: 'flx',
			openInterest: 20,
			category: ['Gold & Commodities'],
			assetClass: ['Commodity Perp']
		},
		{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', openInterest: 120 },
		{
			...baseMarket,
			id: 'xyz:nvda',
			contract: 'xyz:NVDA',
			referenceAsset: 'NVIDIA',
			venue: 'xyz',
			openInterest: 210
		}
	])
	fetchRWAPerpsMarketsByVenue.mockResolvedValue([
		{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', referenceAsset: 'Meta', estimatedProtocolFees24h: 5 },
		{
			...baseMarket,
			id: 'xyz:nvda',
			contract: 'xyz:NVDA',
			referenceAsset: 'NVIDIA',
			venue: 'xyz',
			openInterest: 180,
			estimatedProtocolFees24h: 7
		}
	])
	fetchRWAPerpsMarketsByAssetGroup.mockImplementation(async (assetGroup: string) => {
		if (assetGroup === 'Equities') {
			return [
				{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', referenceAsset: 'Meta', estimatedProtocolFees24h: 5 },
				{
					...baseMarket,
					id: 'xyz:nvda',
					contract: 'xyz:NVDA',
					referenceAsset: 'NVIDIA',
					venue: 'xyz',
					openInterest: 180,
					estimatedProtocolFees24h: 7
				}
			]
		}

		return [
			{
				...baseMarket,
				id: 'flx:gold',
				contract: 'flx:GOLD',
				referenceAsset: 'Gold',
				referenceAssetGroup: 'Commodities',
				venue: 'flx',
				openInterest: 20,
				assetClass: ['Commodity Perp'],
				estimatedProtocolFees24h: 2
			}
		]
	})
	fetchRWAPerpsOverviewBreakdownChartData.mockImplementation(async (request: any) => {
		const target = request.assetGroup ?? request.venue ?? 'all'
		const key = request.key
		const breakdown = request.breakdown

		if (target === 'all' && key === 'openInterest' && breakdown === 'baseAsset') {
			return [
				{ timestamp: 1774483200000, Meta: 120 },
				{ timestamp: 1774569600000, NVIDIA: 130, Gold: 100 }
			]
		}

		if (target === 'all' && key === 'volume24h' && breakdown === 'baseAsset') {
			return [
				{ timestamp: 1774483200000, Meta: 70 },
				{ timestamp: 1774569600000, NVIDIA: 90, Gold: 40 }
			]
		}

		if (target === 'all' && key === 'openInterest' && breakdown === 'assetClass') {
			return [
				{ timestamp: 1774483200000, 'Stock Perp': 120 },
				{ timestamp: 1774569600000, 'Stock Perp': 130, 'Commodity Perp': 100 }
			]
		}

		if (target === 'all' && key === 'openInterest' && breakdown === 'assetGroup') {
			return [
				{ timestamp: 1774483200000, Equities: 120 },
				{ timestamp: 1774569600000, Equities: 130, Commodities: 100 }
			]
		}

		if (target === 'all' && key === 'openInterest' && breakdown === 'venue') {
			return [
				{ timestamp: 1774483200000, xyz: 120 },
				{ timestamp: 1774569600000, xyz: 250, flx: 100 }
			]
		}

		if (target === 'all' && key === 'markets' && breakdown === 'baseAsset') {
			return [
				{ timestamp: 1774483200000, Meta: 1 },
				{ timestamp: 1774569600000, NVIDIA: 1, Gold: 1 }
			]
		}

		if (target === 'all' && key === 'markets' && breakdown === 'assetGroup') {
			return [
				{ timestamp: 1774483200000, Equities: 1 },
				{ timestamp: 1774569600000, Equities: 1, Commodities: 1 }
			]
		}

		if (target === 'xyz' && key === 'openInterest' && breakdown === 'assetGroup') {
			return [
				{ timestamp: 1774483200000, Equities: 120 },
				{ timestamp: 1774569600000, Equities: 130 }
			]
		}

		if (target === 'xyz' && key === 'openInterest' && breakdown === 'baseAsset') {
			return [
				{ timestamp: 1774483200000, Meta: 120 },
				{ timestamp: 1774569600000, NVIDIA: 130 }
			]
		}

		if (target === 'xyz' && key === 'volume24h' && breakdown === 'baseAsset') {
			return [
				{ timestamp: 1774483200000, Meta: 30 },
				{ timestamp: 1774569600000, NVIDIA: 90 }
			]
		}

		if (target === 'Equities' && key === 'volume24h' && breakdown === 'baseAsset') {
			return [
				{ timestamp: 1774483200000, Meta: 30 },
				{ timestamp: 1774569600000, NVIDIA: 90 }
			]
		}

		if (target === 'Equities' && key === 'openInterest' && breakdown === 'baseAsset') {
			return [
				{ timestamp: 1774483200000, Meta: 120 },
				{ timestamp: 1774569600000, NVIDIA: 130 }
			]
		}

		if (target === 'Equities' && key === 'markets' && breakdown === 'venue') {
			return [
				{ timestamp: 1774483200000, xyz: 1 },
				{ timestamp: 1774569600000, xyz: 1 }
			]
		}

		return []
	})
	fetchRWAPerpsContractBreakdownChartData.mockImplementation(async (request: any) => {
		if (request.venue === 'xyz' && request.key === 'openInterest') {
			return [
				{ timestamp: 1774483200000, 'xyz:META': 120 },
				{ timestamp: 1774569600000, 'xyz:NVDA': 130 }
			]
		}

		if (request.key === 'markets') {
			return [
				{ timestamp: 1774483200000, 'xyz:META': 1 },
				{ timestamp: 1774569600000, 'xyz:NVDA': 1, 'flx:GOLD': 1 }
			]
		}

		return [
			{ timestamp: 1774483200000, 'xyz:META': 120 },
			{ timestamp: 1774569600000, 'xyz:NVDA': 130, 'flx:GOLD': 100 }
		]
	})
	fetchRWAPerpsMarketChart.mockResolvedValue([
		{
			timestamp: 1774483200,
			openInterest: 100,
			volume24h: 50,
			price: 500,
			priceChange24h: 2,
			fundingRate: 0.00001,
			premium: 0.0002,
			cumulativeFunding: 1
		}
	])
	fetchRWAPerpsFundingHistory.mockResolvedValue([
		{
			timestamp: 1774454400,
			id: 'xyz:meta',
			contract: 'xyz:META',
			venue: 'xyz',
			funding_rate: '0.00000625',
			premium: '0.00010000',
			open_interest: '6203.048',
			funding_payment: '0.03876905',
			created_at: '2026-03-26T15:17:54.413Z'
		}
	])
})

describe('getRWAPerpsContractData', () => {
	it('uses the raw contract identifier and returns a single matching market', async () => {
		fetchRWAPerpsMarketsByContract.mockResolvedValue([{ ...baseMarket, id: 'xyz:meta', venue: 'xyz' }])

		const result = await getRWAPerpsContractData({ contract: 'xyz:META' })

		expect(fetchRWAPerpsMarketsByContract).toHaveBeenCalledWith('xyz:META')
		expect(fetchRWAPerpsMarketChart).toHaveBeenCalledWith('xyz:meta')
		expect(fetchRWAPerpsFundingHistory).toHaveBeenCalledWith('xyz:meta')
		expect(result).toMatchObject({
			contract: {
				contract: 'xyz:META',
				displayName: 'Meta',
				venue: 'xyz',
				baseAsset: 'Meta',
				baseAssetGroup: 'Equities'
			},
			market: {
				id: 'xyz:meta',
				venue: 'xyz',
				price: 500
			}
		})
		expect(result?.marketChart?.[0]).toMatchObject({
			timestamp: 1774483200000,
			price: 500,
			priceChange24h: 2,
			fundingRate: 0.00001,
			premium: 0.0002,
			cumulativeFunding: 1
		})
		expect(result?.fundingHistory?.[0]).toMatchObject({
			timestamp: 1774454400000,
			fundingRate: 0.00000625,
			premium: 0.0001,
			openInterest: 6203.048,
			fundingPayment: 0.03876905
		})
	})

	it('returns null when the contract has no markets', async () => {
		fetchRWAPerpsMarketsByContract.mockResolvedValue([])

		await expect(getRWAPerpsContractData({ contract: 'xyz:MISSING' })).resolves.toBeNull()
		expect(fetchRWAPerpsMarketChart).not.toHaveBeenCalled()
		expect(fetchRWAPerpsFundingHistory).not.toHaveBeenCalled()
	})

	it('keeps the contract data when chart and funding fetches fail', async () => {
		fetchRWAPerpsMarketsByContract.mockResolvedValue([{ ...baseMarket, id: 'xyz:meta', venue: 'xyz' }])
		fetchRWAPerpsMarketChart.mockRejectedValue(new Error('chart failed'))
		fetchRWAPerpsFundingHistory.mockRejectedValue(new Error('funding failed'))

		const result = await getRWAPerpsContractData({ contract: 'xyz:META' })

		expect(result?.contract.contract).toBe('xyz:META')
		expect(result?.marketChart).toBeNull()
		expect(result?.fundingHistory).toBeNull()
	})

	it('returns null when multiple rows make the contract ambiguous', async () => {
		fetchRWAPerpsMarketsByContract.mockResolvedValue([
			{ ...baseMarket, id: 'xyz:meta-1', contract: 'xyz:META' },
			{ ...baseMarket, id: 'xyz:meta-2', contract: 'xyz:META' }
		])

		await expect(getRWAPerpsContractData({ contract: 'xyz:META' })).resolves.toBeNull()
		expect(fetchRWAPerpsMarketChart).not.toHaveBeenCalled()
		expect(fetchRWAPerpsFundingHistory).not.toHaveBeenCalled()
	})
})

describe('perps overview queries', () => {
	it('builds the overview page model with totals, sorted markets, and a preloaded chart for the default time-series view', async () => {
		const result = await getRWAPerpsOverview()

		expect(result).toMatchObject({
			totals: {
				openInterest: 350,
				openInterestChange24h: 25,
				volume24h: 150,
				volume24hChange24h: 50,
				markets: 3,
				protocolFees24h: 3,
				cumulativeFunding: 111
			},
			markets: [{ id: 'xyz:nvda' }, { id: 'xyz:meta' }, { id: 'flx:gold' }]
		})
		expect(result.initialChartDataset).toEqual({
			source: [
				{ timestamp: 1774483200000, Equities: 120 },
				{ timestamp: 1774569600000, Commodities: 100, Equities: 130 }
			],
			dimensions: ['timestamp', 'Equities', 'Commodities']
		})
	})

	it('preloads the overview time-series dataset when the active view is timeSeries', async () => {
		const result = await getRWAPerpsOverview({ activeView: 'timeSeries' })

		expect(result.initialChartDataset).toEqual({
			source: [
				{ timestamp: 1774483200000, Equities: 120 },
				{ timestamp: 1774569600000, Commodities: 100, Equities: 130 }
			],
			dimensions: ['timestamp', 'Equities', 'Commodities']
		})
	})

	it('builds regrouped overview time-series datasets for asset classes', async () => {
		await expect(
			getRWAPerpsBreakdownChartDataset({
				breakdown: 'assetClass',
				key: 'openInterest'
			})
		).resolves.toEqual({
			source: [
				{ timestamp: 1774483200000, 'Stock Perp': 120 },
				{ timestamp: 1774569600000, 'Stock Perp': 130, 'Commodity Perp': 100 }
			],
			dimensions: ['timestamp', 'Stock Perp', 'Commodity Perp']
		})
	})

	it('builds regrouped overview time-series datasets for asset groups', async () => {
		await expect(
			getRWAPerpsBreakdownChartDataset({
				breakdown: 'assetGroup',
				key: 'openInterest'
			})
		).resolves.toEqual({
			source: [
				{ timestamp: 1774483200000, Equities: 120 },
				{ timestamp: 1774569600000, Equities: 130, Commodities: 100 }
			],
			dimensions: ['timestamp', 'Equities', 'Commodities']
		})
	})

	it('builds regrouped overview time-series datasets for reference assets', async () => {
		await expect(
			getRWAPerpsBreakdownChartDataset({
				breakdown: 'baseAsset',
				key: 'markets'
			})
		).resolves.toEqual({
			source: [
				{ timestamp: 1774483200000, Meta: 1 },
				{ timestamp: 1774569600000, NVIDIA: 1, Gold: 1 }
			],
			dimensions: ['timestamp', 'Gold', 'Meta', 'NVIDIA']
		})
	})

	it('builds overview contract time-series datasets from the dedicated contract endpoint', async () => {
		await expect(
			getRWAPerpsContractBreakdownChartDataset({
				key: 'markets'
			})
		).resolves.toEqual({
			source: [
				{ timestamp: 1774483200000, 'xyz:META': 1 },
				{ timestamp: 1774569600000, 'xyz:NVDA': 1, 'flx:GOLD': 1 }
			],
			dimensions: ['timestamp', 'flx:GOLD', 'xyz:META', 'xyz:NVDA']
		})
	})

	it('builds the venue page model with links, aggregated protocol fees, and a preloaded default time-series chart', async () => {
		const result = await getRWAPerpsVenuePage({ venue: 'xyz' })

		expect(result).toMatchObject({
			venue: 'xyz',
			totals: {
				openInterest: 280,
				openInterestChange24h: 25,
				volume24h: 100,
				volume24hChange24h: 49.999999999999986,
				markets: 2,
				protocolFees24h: 12
			},
			venueLinks: [
				{ label: 'All', to: '/rwa/perps/venues' },
				{ label: 'xyz', to: '/rwa/perps/venue/xyz' },
				{ label: 'flx', to: '/rwa/perps/venue/flx' }
			]
		})
		expect(result?.totals.openInterestChange24h).toBe(25)
		expect(result?.totals.volume24hChange24h).toBeCloseTo(50)
		expect(result?.initialChartDataset).toEqual({
			source: [
				{ timestamp: 1774483200000, Equities: 120 },
				{ timestamp: 1774569600000, Equities: 130 }
			],
			dimensions: ['timestamp', 'Equities']
		})
	})

	it('resolves venue slugs back to the canonical venue name', async () => {
		fetchRWAPerpsList.mockResolvedValueOnce({
			contracts: [],
			venues: ['XYZ Exchange'],
			categories: [],
			assetGroups: [],
			total: 1
		})
		fetchRWAPerpsStats.mockResolvedValueOnce({
			totalOpenInterest: 130,
			totalVolume24h: 90,
			totalMarkets: 2,
			totalCumulativeFunding: 0,
			byVenue: {
				'XYZ Exchange': {
					openInterest: 130,
					volume24h: 90,
					markets: 2
				}
			},
			byAssetGroup: {}
		})
		fetchRWAPerpsMarketsByVenue.mockResolvedValueOnce([
			{ ...baseMarket, id: 'xyz:meta', venue: 'XYZ Exchange', estimatedProtocolFees24h: 5 },
			{
				...baseMarket,
				id: 'xyz:nvda',
				contract: 'xyz:NVDA',
				venue: 'XYZ Exchange',
				referenceAsset: 'NVIDIA',
				openInterest: 30,
				volume24h: 40,
				estimatedProtocolFees24h: 7
			}
		])
		fetchRWAPerpsOverviewBreakdownChartData.mockResolvedValueOnce([
			{ timestamp: 1774483200, Meta: 120 },
			{ timestamp: 1774569600, Meta: 100, NVIDIA: 30 }
		])
		fetchRWAPerpsOverviewBreakdownChartData.mockResolvedValueOnce([
			{ timestamp: 1774483200, Meta: 30 },
			{ timestamp: 1774569600, Meta: 50, NVIDIA: 40 }
		])

		const result = await getRWAPerpsVenuePage({ venue: 'xyz-exchange' })

		expect(fetchRWAPerpsMarketsByVenue).toHaveBeenCalledWith('XYZ Exchange')
		expect(result?.venue).toBe('XYZ Exchange')
		expect(result?.venueLinks).toEqual([
			{ label: 'All', to: '/rwa/perps/venues' },
			{ label: 'XYZ Exchange', to: '/rwa/perps/venue/xyz-exchange' }
		])
	})

	it('preloads the venue time-series dataset when the active view is timeSeries', async () => {
		const result = await getRWAPerpsVenuePage({ venue: 'xyz', activeView: 'timeSeries' })

		expect(result?.initialChartDataset.dimensions).toEqual(['timestamp', 'Meta', 'NVIDIA'])
	})

	it('returns null for an unknown venue', async () => {
		await expect(getRWAPerpsVenuePage({ venue: 'missing' })).resolves.toBeNull()
	})

	it('builds the asset-group page model, overview rows, and a preloaded default time-series chart', async () => {
		const result = await getRWAPerpsAssetGroupPage({ assetGroup: 'equities' })

		expect(result).toMatchObject({
			assetGroup: 'Equities',
			totals: {
				openInterest: 280,
				openInterestChange24h: 25,
				volume24h: 100,
				volume24hChange24h: 49.999999999999986,
				markets: 2,
				protocolFees24h: 12
			},
			assetGroupLinks: [
				{ label: 'All', to: '/rwa/perps/asset-groups' },
				{ label: 'Commodities', to: '/rwa/perps/asset-group/commodities' },
				{ label: 'Equities', to: '/rwa/perps/asset-group/equities' }
			]
		})
		expect(result?.totals.openInterestChange24h).toBe(25)
		expect(result?.initialChartDataset).toEqual({
			source: [
				{ timestamp: 1774483200000, Meta: 120 },
				{ timestamp: 1774569600000, NVIDIA: 130 }
			],
			dimensions: ['timestamp', 'NVIDIA', 'Meta']
		})
	})
})

describe('perps overview helpers', () => {
	it('maps venue stats into rows sorted by open interest', async () => {
		await expect(getRWAPerpsVenuesOverview()).resolves.toMatchObject({
			rows: [
				{
					venue: 'xyz',
					openInterest: 250,
					openInterestShare: 250 / 350,
					volume24h: 160,
					volume24hShare: 160 / 200,
					markets: 2
				},
				{
					venue: 'flx',
					openInterest: 100,
					openInterestShare: 100 / 350,
					volume24h: 40,
					volume24hShare: 40 / 200,
					markets: 1
				}
			],
			initialChartDataset: {
				dimensions: ['timestamp', 'xyz', 'flx']
			}
		})
	})

	it('maps asset-group stats into rows sorted by open interest', async () => {
		await expect(getRWAPerpsAssetGroupsOverview()).resolves.toMatchObject({
			rows: [
				{
					assetGroup: 'Equities',
					openInterest: 250,
					openInterestShare: 250 / 350,
					volume24h: 160,
					volume24hShare: 160 / 200,
					markets: 2
				},
				{
					assetGroup: 'Commodities',
					openInterest: 100,
					openInterestShare: 100 / 350,
					volume24h: 40,
					volume24hShare: 40 / 200,
					markets: 1
				}
			]
		})
	})

	it('aggregates overview chart rows by timestamp into a multi-series dataset', () => {
		expect(toRWAPerpsBreakdownChartDataset([{ timestamp: 1774483200000, xyz: 100, flx: 20 }])).toEqual({
			source: [{ timestamp: 1774483200000, xyz: 100, flx: 20 }],
			dimensions: ['timestamp', 'xyz', 'flx']
		})
	})

	it('counts markets per timestamp when building overview markets datasets', () => {
		expect(
			toRWAPerpsBreakdownChartDataset([
				{ timestamp: 1774483200000, xyz: 2, flx: 1 },
				{ timestamp: 1774569600000, flx: 1 }
			])
		).toEqual({
			source: [
				{ timestamp: 1774483200000, xyz: 2, flx: 1 },
				{ timestamp: 1774569600000, flx: 1 }
			],
			dimensions: ['timestamp', 'xyz', 'flx']
		})
	})

	it('builds snapshot totals for overview and venue breakdowns', () => {
		expect(
			buildRWAPerpsOverviewSnapshotBreakdownTotals({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', referenceAsset: 'Meta' },
					{
						...baseMarket,
						id: 'xyz:nvda',
						contract: 'xyz:NVDA',
						venue: 'xyz',
						referenceAsset: 'NVIDIA',
						openInterest: 150
					},
					{ ...baseMarket, id: 'flx:gold', venue: 'flx', referenceAsset: 'Gold', openInterest: 50 }
				],
				breakdown: 'venue',
				key: 'openInterest'
			})
		).toEqual([
			{ name: 'xyz', value: 250 },
			{ name: 'flx', value: 50 }
		])

		expect(
			buildRWAPerpsVenueSnapshotBreakdownTotals({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', referenceAsset: 'Meta' },
					{
						...baseMarket,
						id: 'xyz:nvda',
						contract: 'xyz:NVDA',
						referenceAsset: 'NVIDIA',
						openInterest: 150
					}
				],
				breakdown: 'baseAsset',
				key: 'markets'
			})
		).toEqual([
			{ name: 'Meta', value: 1 },
			{ name: 'NVIDIA', value: 1 }
		])

		expect(
			buildRWAPerpsOverviewSnapshotBreakdownTotals({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', contract: 'xyz:META', referenceAsset: 'Meta' },
					{
						...baseMarket,
						id: 'flx:meta',
						contract: 'flx:META',
						venue: 'flx',
						referenceAsset: 'Meta',
						openInterest: 80
					}
				],
				breakdown: 'contract',
				key: 'openInterest'
			})
		).toEqual([
			{ name: 'xyz:META', value: 100 },
			{ name: 'flx:META', value: 80 }
		])

		expect(
			buildRWAPerpsVenueSnapshotBreakdownTotals({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', contract: 'xyz:META', referenceAsset: 'Meta' },
					{
						...baseMarket,
						id: 'xyz:nvda',
						contract: 'xyz:NVDA',
						referenceAsset: 'NVIDIA',
						openInterest: 150
					}
				],
				breakdown: 'contract',
				key: 'markets'
			})
		).toEqual([
			{ name: 'xyz:META', value: 1 },
			{ name: 'xyz:NVDA', value: 1 }
		])

		expect(
			buildRWAPerpsOverviewSnapshotBreakdownTotals({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', referenceAssetGroup: 'Equities', referenceAsset: 'Meta' },
					{
						...baseMarket,
						id: 'xyz:gold',
						contract: 'xyz:GOLD',
						referenceAssetGroup: 'Commodities',
						referenceAsset: 'Gold',
						openInterest: 50
					}
				],
				breakdown: 'assetGroup',
				key: 'openInterest'
			})
		).toEqual([
			{ name: 'Equities', value: 100 },
			{ name: 'Commodities', value: 50 }
		])

		expect(
			buildRWAPerpsVenueSnapshotBreakdownTotals({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', referenceAssetGroup: 'Equities', referenceAsset: 'Meta' },
					{
						...baseMarket,
						id: 'xyz:gold',
						contract: 'xyz:GOLD',
						referenceAssetGroup: 'Commodities',
						referenceAsset: 'Gold',
						openInterest: 50
					}
				],
				breakdown: 'assetGroup',
				key: 'markets'
			})
		).toEqual([
			{ name: 'Commodities', value: 1 },
			{ name: 'Equities', value: 1 }
		])

		expect(
			buildRWAPerpsAssetGroupSnapshotBreakdownTotals({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', referenceAsset: 'Meta' },
					{
						...baseMarket,
						id: 'xyz:nvda',
						contract: 'xyz:NVDA',
						venue: 'xyz',
						referenceAsset: 'NVIDIA',
						openInterest: 150
					}
				],
				breakdown: 'venue',
				key: 'openInterest'
			})
		).toEqual([{ name: 'xyz', value: 250 }])
	})

	it('keeps treemap group labels aligned with snapshot and time-series breakdown labels', () => {
		const rows = [
			{
				...baseMarket,
				id: 'missing:1',
				contract: 'xyz:META',
				venue: '',
				assetClass: null,
				referenceAsset: null,
				openInterest: 100
			},
			{
				...baseMarket,
				id: 'missing:2',
				contract: '',
				venue: 'flx',
				assetClass: null,
				referenceAsset: null,
				openInterest: 50
			}
		]

		expect(
			buildRWAPerpsOverviewSnapshotBreakdownTotals({
				rows,
				breakdown: 'venue',
				key: 'openInterest'
			}).map((item) => item.name)
		).toEqual(['Unknown', 'flx'])

		expect(
			buildRWAPerpsTreemapTreeData({
				mode: 'overview',
				markets: rows,
				metric: 'openInterest',
				parentGrouping: 'venue',
				nestedBy: 'none'
			}).map((item) => item.name)
		).toEqual(['Unknown', 'flx'])

		expect(toRWAPerpsBreakdownChartDataset([{ timestamp: 1774483200000, META: 100, Unknown: 50 }]).dimensions).toEqual([
			'timestamp',
			'META',
			'Unknown'
		])

		expect(
			buildRWAPerpsTreemapTreeData({
				mode: 'overview',
				markets: rows,
				metric: 'openInterest',
				parentGrouping: 'baseAsset',
				nestedBy: 'none'
			}).map((item) => item.name)
		).toEqual(['META', 'Unknown'])
	})

	it('builds target-aware time-series datasets for venue and contract requests', async () => {
		await expect(
			getRWAPerpsBreakdownChartDataset({
				venue: 'xyz',
				breakdown: 'assetGroup',
				key: 'openInterest'
			})
		).resolves.toEqual({
			source: [
				{ timestamp: 1774483200000, Equities: 120 },
				{ timestamp: 1774569600000, Equities: 130 }
			],
			dimensions: ['timestamp', 'Equities']
		})

		await expect(
			getRWAPerpsBreakdownChartDataset({
				venue: 'xyz',
				breakdown: 'baseAsset',
				key: 'openInterest'
			})
		).resolves.toEqual({
			source: [
				{ timestamp: 1774483200000, Meta: 120 },
				{ timestamp: 1774569600000, NVIDIA: 130 }
			],
			dimensions: ['timestamp', 'NVIDIA', 'Meta']
		})

		await expect(
			getRWAPerpsContractBreakdownChartDataset({
				venue: 'xyz',
				key: 'openInterest'
			})
		).resolves.toEqual({
			source: [
				{ timestamp: 1774483200000, 'xyz:META': 120 },
				{ timestamp: 1774569600000, 'xyz:NVDA': 130 }
			],
			dimensions: ['timestamp', 'xyz:NVDA', 'xyz:META']
		})
	})

	it('orders series by latest available value instead of first-seen row order', () => {
		expect(
			toRWAPerpsBreakdownChartDataset([
				{ timestamp: 1774483200000, alpha: 100, beta: 80, gamma: 60 },
				{ timestamp: 1774569600000, alpha: 90, beta: 90 }
			]).dimensions
		).toEqual(['timestamp', 'alpha', 'beta', 'gamma'])
	})

	it('groups multi-series datasets into a single total series', () => {
		expect(
			groupRWAPerpsTimeSeriesDataset({
				source: [
					{ timestamp: 1774569600000, Meta: 80, NVIDIA: 20, ignored: null },
					{ timestamp: 1774483200000, Meta: 100, NVIDIA: '5', Gold: undefined }
				],
				dimensions: ['timestamp', 'Meta', 'NVIDIA', 'Gold']
			})
		).toEqual({
			source: [
				{ timestamp: 1774483200000, Total: 105 },
				{ timestamp: 1774569600000, Total: 100 }
			],
			dimensions: ['timestamp', 'Total']
		})
	})

	it('appends a total overlay while preserving the original breakdown series', () => {
		expect(
			appendRWAPerpsTimeSeriesDatasetTotal({
				source: [
					{ timestamp: 1774569600000, Meta: 80, NVIDIA: 20, ignored: null },
					{ timestamp: 1774483200000, Meta: 100, NVIDIA: '5', Gold: undefined }
				],
				dimensions: ['timestamp', 'Meta', 'NVIDIA', 'Gold']
			})
		).toEqual({
			source: [
				{ timestamp: 1774483200000, Meta: 100, NVIDIA: '5', Gold: undefined, Total: 105 },
				{ timestamp: 1774569600000, Meta: 80, NVIDIA: 20, ignored: null, Total: 100 }
			],
			dimensions: ['timestamp', 'Total', 'Meta', 'NVIDIA', 'Gold']
		})
	})
})

describe('hasEnoughTimeSeriesHistory', () => {
	it('rejects empty, single-timestamp, and dimensionless datasets', () => {
		expect(hasEnoughTimeSeriesHistory({ source: [], dimensions: ['timestamp'] })).toBe(false)
		expect(
			hasEnoughTimeSeriesHistory({
				source: [{ timestamp: 1774483200000, xyz: 10 }],
				dimensions: ['timestamp', 'xyz']
			})
		).toBe(false)
		expect(
			hasEnoughTimeSeriesHistory({
				source: [{ timestamp: 1774483200000 }, { timestamp: 1774569600000 }],
				dimensions: ['timestamp']
			})
		).toBe(false)
	})

	it('accepts datasets with multiple timestamps and at least one data series', () => {
		expect(
			hasEnoughTimeSeriesHistory({
				source: [
					{ timestamp: 1774483200000, xyz: 10 },
					{ timestamp: 1774569600000, xyz: 12 }
				],
				dimensions: ['timestamp', 'xyz']
			})
		).toBe(true)
	})
})
