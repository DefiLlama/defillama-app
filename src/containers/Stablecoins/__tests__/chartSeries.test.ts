import { describe, expect, it } from 'vitest'
import {
	buildAreaPayload,
	buildDominancePayload,
	buildTokenInflowsPayload,
	buildTotalMcapPayload,
	buildUsdInflowsPayload
} from '../chartSeries'
import { buildStablecoinChartData, formatPeggedChainsData } from '../utils'

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

	it('keeps total market cap ordering, currency totals, and missing values exact', () => {
		const mixedCurrencyParams = {
			chartDataByAssetOrChain: [
				[
					{ date: 1609632000, mcap: { peggedUSD: 30, peggedEUR: 5 } },
					{ date: 1609459200, mcap: { peggedUSD: 10, peggedEUR: 2 } },
					{ date: 1609545600 }
				],
				[
					{ date: 1609459200, mcap: { peggedUSD: 3 } },
					{ date: 1609545600, mcap: { peggedUSD: 4 } },
					{ date: 1609632000, mcap: { peggedUSD: 5 } }
				]
			],
			assetsOrChainsList: ['EUR Stable', 'USD Stable'],
			filteredIndexes: [0, 1],
			issuanceType: 'mcap',
			selectedChain: 'All'
		}
		const payload = buildTotalMcapPayload(mixedCurrencyParams)

		expect(payload.dataset.source).toEqual([
			{ timestamp: 1609459200000, Mcap: 15 },
			{ timestamp: 1609545600000, Mcap: 4 },
			{ timestamp: 1609632000000, Mcap: 40 }
		])
		expect(payload.dataset.dimensions).toEqual(['timestamp', 'Mcap'])
	})

	it('skips malformed dates before shaping mcap chart rows', () => {
		const malformedDateParams = {
			chartDataByAssetOrChain: [
				[
					{ date: 'bad-date', mcap: { peggedUSD: 999 } },
					{ date: 1609459200, mcap: { peggedUSD: 10 } }
				],
				[
					{ date: 1609459200, mcap: { peggedUSD: 5 } },
					{ date: 'not-a-timestamp', mcap: { peggedUSD: 999 } }
				]
			],
			assetsOrChainsList: ['USDT', 'USDC'],
			filteredIndexes: [0, 1],
			issuanceType: 'mcap',
			selectedChain: 'All'
		}

		expect(buildTotalMcapPayload(malformedDateParams).dataset.source).toEqual([{ timestamp: 1609459200000, Mcap: 15 }])
		expect(buildAreaPayload(malformedDateParams, { stackName: 'tokenMcaps' }).dataset.source).toEqual([
			{ timestamp: 1609459200000, USDT: 10, USDC: 5 }
		])
		expect(buildDominancePayload(malformedDateParams).dataset.source).toEqual([
			{ timestamp: 1609459200000, USDT: 66.67, USDC: 33.33 }
		])
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

	it('keeps area rows sparse when a visible series has no value for a timestamp', () => {
		const sparseAreaParams = {
			chartDataByAssetOrChain: [
				[
					{ date: 1609459200, mcap: { peggedUSD: 10 } },
					{ date: 1609545600, mcap: { peggedUSD: 20 } }
				],
				[{ date: 1609545600, mcap: { peggedUSD: 5 } }]
			],
			assetsOrChainsList: ['USDT', 'USDC'],
			filteredIndexes: [0, 1],
			issuanceType: 'mcap',
			selectedChain: 'All'
		}
		const payload = buildAreaPayload(sparseAreaParams, { stackName: 'tokenMcaps' })

		expect(payload.dataset.source).toEqual([
			{ timestamp: 1609459200000, USDT: 10 },
			{ timestamp: 1609545600000, USDT: 20, USDC: 5 }
		])
		expect(payload.dataset.dimensions).toEqual(['timestamp', 'USDT', 'USDC'])
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

describe('stablecoin table data formatters', () => {
	it('keeps chain rows sorted with exact null and dominance values', () => {
		const result = formatPeggedChainsData({
			chainList: ['Small', 'Big', 'Empty'],
			peggedChartDataByChain: [
				[
					{
						date: '1609459200',
						totalCirculatingUSD: { peggedUSD: 100 },
						totalCirculating: { peggedUSD: 80 },
						totalUnreleased: { peggedUSD: 20 },
						totalBridgedToUSD: { peggedUSD: 5 },
						totalMintedUSD: { peggedUSD: 95 }
					},
					{
						date: '1609545600',
						totalCirculatingUSD: { peggedUSD: 110 },
						totalCirculating: { peggedUSD: 90 },
						totalUnreleased: { peggedUSD: 20 },
						totalBridgedToUSD: { peggedUSD: 6 },
						totalMintedUSD: { peggedUSD: 104 }
					}
				],
				[
					{
						date: '1609459200',
						totalCirculatingUSD: { peggedUSD: 200 },
						totalCirculating: { peggedUSD: 160 },
						totalUnreleased: { peggedUSD: 40 },
						totalBridgedToUSD: { peggedUSD: 7 },
						totalMintedUSD: { peggedUSD: 193 }
					},
					{
						date: '1609545600',
						totalCirculatingUSD: { peggedUSD: 220 },
						totalCirculating: { peggedUSD: 180 },
						totalUnreleased: { peggedUSD: 40 },
						totalBridgedToUSD: { peggedUSD: 8 },
						totalMintedUSD: { peggedUSD: 212 }
					}
				],
				null
			],
			chainDominances: {
				Small: { symbol: 'USDC', mcap: 55 },
				Big: { symbol: 'USDT', mcap: 200 }
			}
		})

		expect(result).toEqual([
			{
				name: 'Big',
				circulating: 180,
				mcap: 220,
				unreleased: 40,
				bridgedTo: 8,
				minted: 212,
				mcapPrevDay: 200,
				mcapPrevWeek: null,
				mcapPrevMonth: null,
				change_1d: 10,
				change_7d: null,
				change_1m: null,
				dominance: { name: 'USDT', value: '90.91' },
				mcaptvl: null
			},
			{
				name: 'Small',
				circulating: 90,
				mcap: 110,
				unreleased: 20,
				bridgedTo: 6,
				minted: 104,
				mcapPrevDay: 100,
				mcapPrevWeek: null,
				mcapPrevMonth: null,
				change_1d: 10,
				change_7d: null,
				change_1m: null,
				dominance: { name: 'USDC', value: '50.00' },
				mcaptvl: null
			},
			{
				name: 'Empty',
				circulating: null,
				mcap: null,
				unreleased: null,
				bridgedTo: null,
				minted: null,
				mcapPrevDay: null,
				mcapPrevWeek: null,
				mcapPrevMonth: null,
				change_1d: null,
				change_7d: null,
				change_1m: null,
				dominance: null,
				mcaptvl: null
			}
		])
	})
})
