import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RWAPerpsContractSummaryMetrics } from './Contract'
import {
	buildRWAPerpsContractChartSpec,
	buildRWAPerpsContractInfoRows,
	DEFAULT_ENABLED_RWA_PERPS_CONTRACT_CHART_METRICS,
	type RWAPerpsContractChartMetricKey
} from './contractPageUtils'
import type { IRWAPerpsContractData } from './types'

const baseContract: IRWAPerpsContractData = {
	contract: {
		contract: 'xyz:META',
		displayName: 'Meta',
		venue: 'xyz',
		baseAsset: 'Meta',
		baseAssetGroup: 'Equities',
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
		assetClass: ['Single stock synthetic perp'],
		parentPlatform: 'trade[XYZ]',
		pair: 'META-USD',
		marginAsset: 'USDC',
		settlementAsset: 'USDC',
		category: ['RWA Perpetuals'],
		issuer: 'XYZ',
		website: ['https://trade.xyz/'],
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

describe('RWAPerpsContractSummaryMetrics', () => {
	it('renders price with inline 24h change and grouped metric sections without key-metrics png export', () => {
		const html = renderToStaticMarkup(<RWAPerpsContractSummaryMetrics contract={baseContract} />)

		expect(html).toContain('Price')
		expect(html).toContain('+5.00%')
		expect(html).toContain('Est. Protocol Fees 30d')
		expect(html).toContain('Est. Protocol Fees 7d')
		expect(html).toContain('Est. Protocol Fees 24h')
		expect(html).toContain('Latest Funding Rate')
		expect(html).toContain('Trading Parameters')
		expect(html).toContain('Market Reference')
		expect(html).not.toContain('Download Key Metrics as PNG')
	})
})

describe('buildRWAPerpsContractInfoRows', () => {
	it('omits duplicate reference assets and empty website rows', () => {
		const rows = buildRWAPerpsContractInfoRows({
			...baseContract,
			contract: {
				...baseContract.contract,
				baseAsset: 'META',
				website: null
			}
		})

		expect(rows.some((row) => row.label === 'Base Asset')).toBe(false)
		expect(rows.some((row) => row.label === 'Website')).toBe(false)
	})

	it('includes the reference asset when it differs from the contract symbol suffix', () => {
		const rows = buildRWAPerpsContractInfoRows({
			...baseContract,
			contract: {
				...baseContract.contract,
				baseAsset: 'Meta Platforms'
			}
		})
		expect(rows.find((row) => row.label === 'Base Asset')).toEqual({
			label: 'Base Asset',
			value: 'Meta Platforms'
		})
	})
})

describe('buildRWAPerpsContractChartSpec', () => {
	it('keeps the expected default enabled metrics', () => {
		expect(DEFAULT_ENABLED_RWA_PERPS_CONTRACT_CHART_METRICS).toEqual(['openInterest', 'volume24h', 'price'])
	})

	it('uses summed buckets for volume and last-value buckets for line metrics', () => {
		const spec = buildRWAPerpsContractChartSpec({
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

	it('keeps grouped volume as a bar series without offering cumulative accumulation', () => {
		const spec = buildRWAPerpsContractChartSpec({
			marketPoints: chartPoints,
			fundingHistory: null,
			groupBy: 'monthly',
			enabledMetrics: ['volume24h', 'price', 'fundingRate']
		})

		expect(spec.charts.map((chart) => [chart.name, chart.type])).toEqual([
			['Volume 24h', 'bar'],
			['Price', 'line'],
			['Funding Rate', 'line']
		])

		expect(spec.dataset.source).toMatchObject([
			{ timestamp: Date.UTC(2026, 2, 1), 'Volume 24h': 30, Price: 12, 'Funding Rate': 2 },
			{ timestamp: Date.UTC(2026, 3, 1), 'Volume 24h': 30, Price: 14, 'Funding Rate': 3 }
		])
	})

	it('keeps colors stable regardless of metric selection order', () => {
		const spec = buildRWAPerpsContractChartSpec({
			marketPoints: chartPoints,
			fundingHistory: null,
			groupBy: 'daily',
			enabledMetrics: ['premium', 'price'] as RWAPerpsContractChartMetricKey[]
		})

		expect(spec.charts.map((chart) => [chart.name, chart.color])).toEqual([
			['Premium', '#EF4444'],
			['Price', '#22C55E']
		])
	})

	it('uses funding history for funding and premium when it is available', () => {
		const spec = buildRWAPerpsContractChartSpec({
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

	it('sorts source points chronologically before taking last-value grouped buckets', () => {
		const spec = buildRWAPerpsContractChartSpec({
			marketPoints: [chartPoints[1], chartPoints[0], chartPoints[2]],
			fundingHistory: [fundingHistoryPoints[1], fundingHistoryPoints[0]],
			groupBy: 'monthly',
			enabledMetrics: ['openInterest', 'fundingRate']
		})

		expect(spec.dataset.source).toMatchObject([
			{
				timestamp: Date.UTC(2026, 2, 1),
				'Open Interest': 120,
				'Funding Rate': 0.2
			},
			{
				timestamp: Date.UTC(2026, 3, 1),
				'Open Interest': 140
			}
		])
	})

	it('normalizes second-based timestamps to milliseconds before grouping', () => {
		const spec = buildRWAPerpsContractChartSpec({
			marketPoints: [
				{
					...chartPoints[0],
					timestamp: Math.floor(Date.UTC(2026, 2, 1) / 1e3)
				}
			],
			fundingHistory: [
				{
					...fundingHistoryPoints[0],
					timestamp: Math.floor(Date.UTC(2026, 2, 2) / 1e3)
				}
			],
			groupBy: 'daily',
			enabledMetrics: ['openInterest', 'fundingRate']
		})

		expect(spec.dataset.source).toEqual([
			{ timestamp: Date.UTC(2026, 2, 1), 'Open Interest': 100 },
			{ timestamp: Date.UTC(2026, 2, 2), 'Funding Rate': 0.1 }
		])
	})
})
