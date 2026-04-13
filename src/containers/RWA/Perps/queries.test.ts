import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	buildRWAPerpsOverviewSnapshotBreakdownTotals,
	buildRWAPerpsVenueSnapshotBreakdownTotals,
	groupRWAPerpsTimeSeriesDataset,
	hasEnoughTimeSeriesHistory,
	getRWAPerpsBreakdownChartDataset,
	getRWAPerpsContractData,
	getRWAPerpsOverview,
	getRWAPerpsVenueBreakdownChartDataset,
	getRWAPerpsVenuePage,
	getRWAPerpsVenuesOverview,
	toRWAPerpsBreakdownChartDataset
} from './queries'
import { buildRWAPerpsTreemapTreeData } from './treemap'

const {
	fetchRWAPerpsMarketsByContract,
	fetchRWAPerpsMarketChart,
	fetchRWAPerpsFundingHistory,
	fetchRWAPerpsStats,
	fetchRWAPerpsCategoryChart,
	fetchRWAPerpsVenueChart,
	fetchRWAPerpsCurrent,
	fetchRWAPerpsList,
	fetchRWAPerpsMarketsByVenue
} = vi.hoisted(() => ({
	fetchRWAPerpsMarketsByContract: vi.fn(),
	fetchRWAPerpsMarketChart: vi.fn(),
	fetchRWAPerpsFundingHistory: vi.fn(),
	fetchRWAPerpsStats: vi.fn(),
	fetchRWAPerpsCategoryChart: vi.fn(),
	fetchRWAPerpsVenueChart: vi.fn(),
	fetchRWAPerpsCurrent: vi.fn(),
	fetchRWAPerpsList: vi.fn(),
	fetchRWAPerpsMarketsByVenue: vi.fn()
}))

vi.mock('./api', () => ({
	fetchRWAPerpsMarketsByContract,
	fetchRWAPerpsMarketChart,
	fetchRWAPerpsFundingHistory,
	fetchRWAPerpsStats,
	fetchRWAPerpsCategoryChart,
	fetchRWAPerpsVenueChart,
	fetchRWAPerpsCurrent,
	fetchRWAPerpsList,
	fetchRWAPerpsMarketsByVenue
}))

const baseMarket = {
	timestamp: 1775011512,
	contract: 'xyz:META',
	venue: 'xyz',
	openInterest: 100,
	volume24h: 50,
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
})

beforeEach(() => {
	fetchRWAPerpsList.mockResolvedValue({
		contracts: ['xyz:META', 'flx:GOLD'],
		venues: ['xyz', 'flx'],
		categories: ['RWA Perps', 'Gold & Commodities'],
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
	fetchRWAPerpsCategoryChart.mockImplementation(async (category: string) => {
		if (category === 'RWA Perps') {
			return [
				{
					...baseMarket,
					id: 'xyz:meta',
					category: ['RWA Perps'],
					timestamp: 1774483200,
					openInterest: 120,
					volume24h: 70
				},
				{
					...baseMarket,
					id: 'xyz:nvda',
					contract: 'xyz:NVDA',
					category: ['RWA Perps'],
					timestamp: 1774569600,
					openInterest: 180,
					volume24h: 100
				}
			]
		}

		return [
			{
				...baseMarket,
				id: 'flx:gold',
				contract: 'flx:GOLD',
				category: ['Gold & Commodities'],
				venue: 'flx',
				timestamp: 1774569600,
				openInterest: 50,
				volume24h: 30
			}
		]
	})
	fetchRWAPerpsVenueChart.mockImplementation(async (venue: string) => {
		if (venue === 'xyz') {
			return [
				{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', timestamp: 1774483200, openInterest: 120, volume24h: 70 },
				{
					...baseMarket,
					id: 'xyz:nvda',
					contract: 'xyz:NVDA',
					referenceAsset: 'NVIDIA',
					venue: 'xyz',
					timestamp: 1774569600,
					openInterest: 130,
					volume24h: 90
				}
			]
		}

		return [
			{
				...baseMarket,
				id: 'flx:gold',
				contract: 'flx:GOLD',
				referenceAsset: 'Gold',
				venue: 'flx',
				assetClass: ['Commodity Perp'],
				timestamp: 1774569600,
				openInterest: 100,
				volume24h: 40
			}
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
	it('builds the overview page model with totals, sorted markets, and no preloaded chart for the default treemap view', async () => {
		const result = await getRWAPerpsOverview()

		expect(result).toMatchObject({
			totals: {
				openInterest: 230,
				openInterestChange24h: 91.66666666666666,
				volume24h: 130,
				volume24hChange24h: 85.71428571428571,
				markets: 3,
				protocolFees24h: 3,
				cumulativeFunding: 111
			},
			markets: [{ id: 'xyz:nvda' }, { id: 'xyz:meta' }, { id: 'flx:gold' }]
		})
		expect(result.initialChartDataset).toEqual({ source: [], dimensions: ['timestamp'] })
	})

	it('preloads the overview time-series dataset when the active view is timeSeries', async () => {
		const result = await getRWAPerpsOverview({ activeView: 'timeSeries' })

		expect(result.initialChartDataset).toEqual({
			source: [
				{ timestamp: 1774483200000, Meta: 120 },
				{ timestamp: 1774569600000, Gold: 100, NVIDIA: 130 }
			],
			dimensions: ['timestamp', 'NVIDIA', 'Meta', 'Gold']
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

	it('builds regrouped overview time-series datasets for raw contracts', async () => {
		await expect(
			getRWAPerpsBreakdownChartDataset({
				breakdown: 'contract',
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

	it('builds the venue page model with links and aggregated protocol fees', async () => {
		const result = await getRWAPerpsVenuePage({ venue: 'xyz' })

		expect(result).toMatchObject({
			venue: 'xyz',
			totals: {
				openInterest: 250,
				volume24h: 90,
				markets: 2,
				protocolFees24h: 12
			},
			venueLinks: [
				{ label: 'All', to: '/rwa/perps/venues' },
				{ label: 'xyz', to: '/rwa/perps/venue/xyz' },
				{ label: 'flx', to: '/rwa/perps/venue/flx' }
			]
		})
		expect(result?.totals.volume24hChange24h).toBeCloseTo(200 / 7, 10)
		expect(result?.initialChartDataset).toEqual({ source: [], dimensions: ['timestamp'] })
	})

	it('preloads the venue time-series dataset when the active view is timeSeries', async () => {
		const result = await getRWAPerpsVenuePage({ venue: 'xyz', activeView: 'timeSeries' })

		expect(result?.initialChartDataset.dimensions).toEqual(['timestamp', 'NVIDIA', 'Meta'])
	})

	it('returns null for an unknown venue', async () => {
		await expect(getRWAPerpsVenuePage({ venue: 'missing' })).resolves.toBeNull()
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
			]
		})
	})

	it('aggregates overview chart rows by timestamp into a multi-series dataset', () => {
		expect(
			toRWAPerpsBreakdownChartDataset({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', category: ['RWA Perps'], timestamp: 1774483200 },
					{
						...baseMarket,
						id: 'flx:gold',
						venue: 'flx',
						category: ['Gold & Commodities'],
						timestamp: 1774483200,
						openInterest: 20
					}
				],
				breakdown: 'venue',
				key: 'openInterest'
			})
		).toEqual({
			source: [{ timestamp: 1774483200000, xyz: 100, flx: 20 }],
			dimensions: ['timestamp', 'xyz', 'flx']
		})
	})

	it('counts markets per timestamp when building overview markets datasets', () => {
		expect(
			toRWAPerpsBreakdownChartDataset({
				rows: [
					{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', category: ['RWA Perps'], timestamp: 1774483200 },
					{
						...baseMarket,
						id: 'xyz:nvda',
						venue: 'xyz',
						category: ['RWA Perps'],
						timestamp: 1774483200
					},
					{
						...baseMarket,
						id: 'flx:gold',
						venue: 'flx',
						category: ['Gold & Commodities'],
						timestamp: 1774483200
					},
					{
						...baseMarket,
						id: 'flx:oil',
						venue: 'flx',
						category: ['Gold & Commodities'],
						timestamp: 1774569600
					}
				],
				breakdown: 'venue',
				key: 'markets'
			})
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

		expect(
			toRWAPerpsBreakdownChartDataset({
				rows: [
					{ ...rows[0], timestamp: 1774483200 },
					{ ...rows[1], timestamp: 1774483200 }
				],
				breakdown: 'baseAsset',
				key: 'openInterest'
			}).dimensions
		).toEqual(['timestamp', 'META', 'Unknown'])

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

	it('builds venue time-series datasets for arbitrary venue breakdowns', async () => {
		await expect(
			getRWAPerpsVenueBreakdownChartDataset({
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
			getRWAPerpsVenueBreakdownChartDataset({
				venue: 'xyz',
				breakdown: 'contract',
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

	it('sorts series by latest value and breaks ties alphabetically', () => {
		expect(
			toRWAPerpsBreakdownChartDataset({
				rows: [
					{ ...baseMarket, id: 'a:1', venue: 'alpha', timestamp: 1774483200, openInterest: 100 },
					{ ...baseMarket, id: 'b:1', venue: 'beta', timestamp: 1774483200, openInterest: 80 },
					{ ...baseMarket, id: 'c:1', venue: 'gamma', timestamp: 1774483200, openInterest: 60 },
					{ ...baseMarket, id: 'a:2', venue: 'alpha', timestamp: 1774569600, openInterest: 90 },
					{ ...baseMarket, id: 'b:2', venue: 'beta', timestamp: 1774569600, openInterest: 90 }
				],
				breakdown: 'venue',
				key: 'openInterest'
			}).dimensions
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
