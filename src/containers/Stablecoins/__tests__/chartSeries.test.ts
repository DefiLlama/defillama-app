import { describe, expect, it } from 'vitest'
import {
	buildAreaPayload,
	buildDominancePayload,
	buildTokenInflowsPayload,
	buildTotalMcapPayload,
	buildUsdInflowsPayload
} from '../chartSeries'
import { buildStablecoinChartData } from '../utils'

const chartDataByAssetOrChain = [
	[
		{ date: 1609459200, mcap: { peggedUSD: 100 }, unreleased: { peggedUSD: 10 } },
		{ date: 1609545600, mcap: { peggedUSD: 125 }, unreleased: { peggedUSD: 10 } },
		{ date: 1609632000, mcap: { peggedUSD: 150 }, unreleased: { peggedUSD: 10 } }
	],
	[
		{ date: 1609459200, mcap: { peggedUSD: 50 }, unreleased: { peggedUSD: 5 } },
		{ date: 1609545600, mcap: { peggedUSD: 60 }, unreleased: { peggedUSD: 5 } },
		{ date: 1609632000, mcap: { peggedUSD: 90 }, unreleased: { peggedUSD: 5 } }
	]
]

const params = {
	chartDataByAssetOrChain,
	assetsOrChainsList: ['USDT', 'USDC'],
	filteredIndexes: [0, 1],
	issuanceType: 'mcap',
	selectedChain: 'All'
}

const circulatingParams = {
	chartDataByAssetOrChain: [
		[
			{ date: 1660000000, circulating: { peggedUSD: 100 }, unreleased: { peggedUSD: 10 } },
			{ date: 1660086400, circulating: { peggedUSD: 125 }, unreleased: { peggedUSD: 15 } }
		],
		[
			{ date: 1660000000, circulating: { peggedUSD: 50 }, unreleased: { peggedUSD: 5 } },
			{ date: 1660086400, circulating: { peggedUSD: 60 }, unreleased: { peggedUSD: 10 } }
		]
	],
	assetsOrChainsList: ['Ethereum', 'Tron'],
	filteredIndexes: [0, 1],
	issuanceType: 'circulating',
	totalChartTooltipLabel: 'Circulating'
}

describe('stablecoin chart series builders', () => {
	it('matches the legacy total market cap output', () => {
		const legacy = buildStablecoinChartData(params)
		const payload = buildTotalMcapPayload(params)

		expect(payload.dataset.source).toEqual(
			legacy.peggedAreaTotalData.map(({ date, Mcap }) => ({ timestamp: Number(date) * 1e3, Mcap }))
		)
		expect(payload.dataset.dimensions).toEqual(['timestamp', 'Mcap'])
	})

	it('adds unreleased values to total circulating payloads when requested', () => {
		const payload = buildTotalMcapPayload(circulatingParams, {
			totalName: 'Circulating',
			includeUnreleased: true
		})

		expect(payload.dataset.source).toEqual([
			{ timestamp: 1660000000000, Circulating: 165 },
			{ timestamp: 1660086400000, Circulating: 210 }
		])
		expect(payload.valueSymbol).toBe('')
		expect(JSON.parse(JSON.stringify(payload)).valueSymbol).toBe('')
	})

	it('matches the legacy area output dimensions and values', () => {
		const legacy = buildStablecoinChartData(params)
		const payload = buildAreaPayload(params, { stackName: 'tokenMcaps' })

		expect(payload.dataset.source).toEqual(
			legacy.peggedAreaChartData.map(({ date, ...values }) => ({
				timestamp: Number(date) * 1e3,
				...values
			}))
		)
		expect(payload.dataset.dimensions).toEqual(['timestamp', 'USDT', 'USDC'])
		expect(payload.stacked).toBe(false)
		expect(payload.showTotalInTooltip).toBe(false)
		expect(payload.charts.every((chart) => !('stack' in chart))).toBe(true)
	})

	it('matches the legacy inflow outputs', () => {
		const legacy = buildStablecoinChartData(params)
		const usdPayload = buildUsdInflowsPayload(params)
		const tokenPayload = buildTokenInflowsPayload(params)

		expect(usdPayload.dataset.source).toEqual(
			legacy.usdInflows.map(([date, Inflows]) => ({ timestamp: Number(date) * 1e3, Inflows }))
		)
		expect(tokenPayload.dataset.source).toEqual(
			legacy.tokenInflows.map(({ date, ...values }) => ({
				timestamp: Number(date) * 1e3,
				...values
			}))
		)
		expect(tokenPayload.dataset.dimensions).toEqual(['timestamp', ...legacy.tokenInflowNames])
	})

	it('builds dominance rows as a 100 percent stacked payload', () => {
		const payload = buildDominancePayload(params)

		expect(payload.valueSymbol).toBe('%')
		expect(payload.expandTo100Percent).toBe(true)
		expect(payload.stacked).toBe(true)
		expect(payload.charts.every((chart) => chart.type === 'line' && chart.stack === 'dominance')).toBe(true)
		expect(payload.dataset.dimensions).toEqual(['timestamp', 'USDT', 'USDC'])
		expect(payload.dataset.source.at(-1)).toMatchObject({
			timestamp: 1609632000000,
			USDT: 62.5,
			USDC: 37.5
		})
	})

	it('keeps token inflows stacked because they render as bars', () => {
		const payload = buildTokenInflowsPayload(params)

		expect(payload.stacked).toBe(true)
		expect(payload.showTotalInTooltip).toBe(true)
		expect(payload.charts.every((chart) => chart.type === 'bar' && chart.stack === 'tokenInflows')).toBe(true)
	})
})
