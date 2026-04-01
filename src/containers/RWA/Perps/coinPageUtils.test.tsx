import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RWAPerpsCoinSummaryMetrics } from './Coin'
import {
	buildRWAPerpsCoinChartSpec,
	buildRWAPerpsCoinInfoRows,
	DEFAULT_ENABLED_RWA_PERPS_COIN_CHART_METRICS,
	type RWAPerpsCoinChartMetricKey
} from './coinPageUtils'
import type { IRWAPerpsCoinData } from './types'

const baseCoin: IRWAPerpsCoinData = {
	coin: {
		coin: 'xyz:META',
		displayName: 'Meta',
		venue: 'xyz',
		referenceAsset: 'Meta',
		referenceAssetGroup: 'Equities',
		assetClass: 'Single stock synthetic perp',
		rwaClassification: 'Programmable Finance',
		accessModel: 'Permissionless',
		parentPlatform: 'trade[XYZ]',
		issuer: 'XYZ',
		website: 'https://trade.xyz/',
		oracleProvider: 'Pyth equity feed',
		description: null,
		categories: ['RWA Perpetuals']
	},
	market: {
		id: 'xyz:meta',
		timestamp: 1775011512,
		coin: 'xyz:META',
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
		assetClass: 'Single stock synthetic perp',
		parentPlatform: 'trade[XYZ]',
		pair: 'META-USD',
		marginAsset: 'USDC',
		settlementAsset: 'USDC',
		category: ['RWA Perpetuals'],
		issuer: 'XYZ',
		website: 'https://trade.xyz/',
		oracleProvider: 'Pyth equity feed',
		description: null,
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
	},
	marketChart: null,
	fundingHistory: null
}

const chartPoints = [
	{
		timestamp: Date.UTC(2026, 2, 1),
		openInterest: 100,
		volume24h: 10,
		price: 10,
		priceChange24h: 1,
		fundingRate: 0.01,
		premium: 0.02,
		cumulativeFunding: 1
	},
	{
		timestamp: Date.UTC(2026, 2, 15),
		openInterest: 120,
		volume24h: 20,
		price: 12,
		priceChange24h: 2,
		fundingRate: 0.02,
		premium: 0.03,
		cumulativeFunding: 2
	},
	{
		timestamp: Date.UTC(2026, 3, 1),
		openInterest: 140,
		volume24h: 30,
		price: 14,
		priceChange24h: 3,
		fundingRate: 0.03,
		premium: 0.04,
		cumulativeFunding: 3
	}
]

const fundingHistoryPoints = [
	{
		timestamp: Date.UTC(2026, 2, 1),
		fundingRate: 0.001,
		premium: 0.01,
		openInterest: 100,
		fundingPayment: 1
	},
	{
		timestamp: Date.UTC(2026, 2, 2),
		fundingRate: 0.002,
		premium: 0.02,
		openInterest: 110,
		fundingPayment: 2
	}
]

describe('RWAPerpsCoinSummaryMetrics', () => {
	it('renders price with inline 24h change and grouped metric sections without key-metrics png export', () => {
		const html = renderToStaticMarkup(<RWAPerpsCoinSummaryMetrics coin={baseCoin} />)

		expect(html).toContain('Price')
		expect(html).toContain('+5.00%')
		expect(html).toContain('Fees 30d')
		expect(html).toContain('Fees 7d')
		expect(html).toContain('Fees 24h')
		expect(html).toContain('Trading Parameters')
		expect(html).toContain('Market Reference')
		expect(html).not.toContain('Download Key Metrics as PNG')
	})
})

describe('buildRWAPerpsCoinInfoRows', () => {
	it('omits duplicate reference assets and empty website rows', () => {
		const rows = buildRWAPerpsCoinInfoRows({
			...baseCoin,
			coin: {
				...baseCoin.coin,
				referenceAsset: 'META',
				website: null
			}
		})

		expect(rows.some((row) => row.label === 'Reference Asset')).toBe(false)
		expect(rows.some((row) => row.label === 'Website')).toBe(false)
	})

	it('includes the reference asset when it differs from the coin suffix', () => {
		const rows = buildRWAPerpsCoinInfoRows({
			...baseCoin,
			coin: {
				...baseCoin.coin,
				referenceAsset: 'Meta Platforms'
			}
		})
		expect(rows.find((row) => row.label === 'Reference Asset')).toEqual({
			label: 'Reference Asset',
			value: 'Meta Platforms'
		})
	})
})

describe('buildRWAPerpsCoinChartSpec', () => {
	it('keeps the expected default enabled metrics', () => {
		expect(DEFAULT_ENABLED_RWA_PERPS_COIN_CHART_METRICS).toEqual(['openInterest', 'volume24h', 'price'])
	})

	it('uses summed buckets for volume and last-value buckets for line metrics', () => {
		const spec = buildRWAPerpsCoinChartSpec({
			marketPoints: chartPoints,
			fundingHistory: null,
			groupBy: 'monthly',
			enabledMetrics: ['openInterest', 'volume24h', 'price']
		})

		expect(spec.charts.map((chart) => [chart.name, chart.type, chart.color])).toEqual([
			['Open Interest', 'line', '#3B82F6'],
			['Volume 24h', 'bar', '#7DD3FC'],
			['Price', 'line', '#22C55E']
		])

		const marchRow = spec.dataset.source.find((row) => row.timestamp === Date.UTC(2026, 2, 1))
		const aprilRow = spec.dataset.source.find((row) => row.timestamp === Date.UTC(2026, 3, 1))

		expect(marchRow).toMatchObject({
			'Open Interest': 120,
			'Volume 24h': 30,
			Price: 12
		})
		expect(aprilRow).toMatchObject({
			'Open Interest': 140,
			'Volume 24h': 30,
			Price: 14
		})
	})

	it('makes only volume cumulative while keeping line metrics non-cumulative in cumulative mode', () => {
		const spec = buildRWAPerpsCoinChartSpec({
			marketPoints: chartPoints,
			fundingHistory: null,
			groupBy: 'cumulative',
			enabledMetrics: ['volume24h', 'price', 'fundingRate']
		})

		expect(spec.charts.map((chart) => [chart.name, chart.type])).toEqual([
			['Volume 24h', 'line'],
			['Price', 'line'],
			['Funding Rate', 'line']
		])

		expect(spec.dataset.source).toMatchObject([
			{ timestamp: Date.UTC(2026, 2, 1), 'Volume 24h': 10, Price: 10, 'Funding Rate': 1 },
			{ timestamp: Date.UTC(2026, 2, 15), 'Volume 24h': 30, Price: 12, 'Funding Rate': 2 },
			{ timestamp: Date.UTC(2026, 3, 1), 'Volume 24h': 60, Price: 14, 'Funding Rate': 3 }
		])
	})

	it('keeps colors stable regardless of metric selection order', () => {
		const spec = buildRWAPerpsCoinChartSpec({
			marketPoints: chartPoints,
			fundingHistory: null,
			groupBy: 'daily',
			enabledMetrics: ['premium', 'price'] as RWAPerpsCoinChartMetricKey[]
		})

		expect(spec.charts.map((chart) => [chart.name, chart.color])).toEqual([
			['Premium', '#EF4444'],
			['Price', '#22C55E']
		])
	})

	it('uses funding history for funding and premium when it is available', () => {
		const spec = buildRWAPerpsCoinChartSpec({
			marketPoints: chartPoints,
			fundingHistory: fundingHistoryPoints,
			groupBy: 'daily',
			enabledMetrics: ['fundingRate', 'premium']
		})

		expect(spec.dataset.source).toMatchObject([
			{ timestamp: Date.UTC(2026, 2, 1), 'Funding Rate': 0.1, Premium: 1 },
			{ timestamp: Date.UTC(2026, 2, 2), 'Funding Rate': 0.2, Premium: 2 }
		])
	})
})
