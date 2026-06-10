import { describe, expect, it } from 'vitest'
import { buildChainTvlChartState } from '../tvlChart'

const DAY_MS = 24 * 60 * 60 * 1000
const LATEST_TIMESTAMP = Date.UTC(2026, 2, 27, 0, 5)
const PREVIOUS_TIMESTAMP = LATEST_TIMESTAMP - DAY_MS
const NOW_MS = Date.UTC(2026, 2, 27, 12)

const TVL_CHART: Array<[number, number]> = [
	[PREVIOUS_TIMESTAMP, 100],
	[LATEST_TIMESTAMP, 200]
]

const BASE_SUMMARY = {
	totalValueUSD: 200,
	tvlPrevDay: 100,
	valueChange24hUSD: 100,
	change24h: 100
}

describe('ChainOverview TVL chart helpers', () => {
	it('uses server summary values without iterating extras when no TVL extras are enabled', () => {
		const result = buildChainTvlChartState({
			tvlChart: TVL_CHART,
			tvlChartSummary: {
				totalValueUSD: 999,
				tvlPrevDay: 900,
				valueChange24hUSD: 99,
				change24h: 11
			},
			extraTvlCharts: {
				staking: { [String(LATEST_TIMESTAMP)]: 50 }
			},
			tvlSettings: {},
			nowMs: NOW_MS
		})

		expect(result.finalTvlChart).toBe(TVL_CHART)
		expect(result.totalValueUSD).toBe(999)
		expect(result.valueChange24hUSD).toBe(99)
		expect(result.change24h).toBe(11)
		expect(result.isGovTokensEnabled).toBeUndefined()
	})

	it('adds enabled extras, subtracts overlap, and recomputes 24h values', () => {
		expect(
			buildChainTvlChartState({
				tvlChart: TVL_CHART,
				tvlChartSummary: BASE_SUMMARY,
				extraTvlCharts: {
					doublecounted: {
						[String(PREVIOUS_TIMESTAMP)]: 10,
						[String(LATEST_TIMESTAMP)]: 20
					},
					liquidstaking: {
						[String(PREVIOUS_TIMESTAMP)]: 30,
						[String(LATEST_TIMESTAMP)]: 40
					},
					dcAndLsOverlap: {
						[String(PREVIOUS_TIMESTAMP)]: 40,
						[String(LATEST_TIMESTAMP)]: 10
					},
					pool2: {
						[String(PREVIOUS_TIMESTAMP)]: 500,
						[String(LATEST_TIMESTAMP)]: 500
					}
				},
				tvlSettings: {
					doublecounted: true,
					liquidstaking: true
				},
				nowMs: NOW_MS
			})
		).toEqual({
			finalTvlChart: [
				[PREVIOUS_TIMESTAMP, 100],
				[LATEST_TIMESTAMP, 250]
			],
			totalValueUSD: 250,
			valueChange24hUSD: 150,
			change24h: 150,
			isGovTokensEnabled: false
		})
	})

	it('subtracts nothing when both overlap parents are enabled but the overlap series is missing', () => {
		expect(
			buildChainTvlChartState({
				tvlChart: TVL_CHART,
				tvlChartSummary: BASE_SUMMARY,
				extraTvlCharts: {
					doublecounted: {
						[String(PREVIOUS_TIMESTAMP)]: 10,
						[String(LATEST_TIMESTAMP)]: 20
					},
					liquidstaking: {
						[String(PREVIOUS_TIMESTAMP)]: 30,
						[String(LATEST_TIMESTAMP)]: 40
					}
				},
				tvlSettings: {
					doublecounted: true,
					liquidstaking: true
				},
				nowMs: NOW_MS
			}).finalTvlChart
		).toEqual([
			[PREVIOUS_TIMESTAMP, 140],
			[LATEST_TIMESTAMP, 260]
		])
	})

	it('does not subtract overlap when only one overlap parent is enabled', () => {
		expect(
			buildChainTvlChartState({
				tvlChart: TVL_CHART,
				tvlChartSummary: BASE_SUMMARY,
				extraTvlCharts: {
					doublecounted: {
						[String(PREVIOUS_TIMESTAMP)]: 10,
						[String(LATEST_TIMESTAMP)]: 20
					},
					dcAndLsOverlap: {
						[String(PREVIOUS_TIMESTAMP)]: 5,
						[String(LATEST_TIMESTAMP)]: 10
					}
				},
				tvlSettings: {
					doublecounted: true
				},
				nowMs: NOW_MS
			}).finalTvlChart
		).toEqual([
			[PREVIOUS_TIMESTAMP, 110],
			[LATEST_TIMESTAMP, 220]
		])
	})

	it('adds gov token extras and exposes the gov token enabled flag', () => {
		expect(
			buildChainTvlChartState({
				tvlChart: TVL_CHART,
				tvlChartSummary: BASE_SUMMARY,
				extraTvlCharts: {
					govtokens: {
						[String(PREVIOUS_TIMESTAMP)]: 1,
						[String(LATEST_TIMESTAMP)]: 2
					}
				},
				tvlSettings: {
					govtokens: true
				},
				nowMs: NOW_MS
			})
		).toMatchObject({
			finalTvlChart: [
				[PREVIOUS_TIMESTAMP, 101],
				[LATEST_TIMESTAMP, 202]
			],
			isGovTokensEnabled: true
		})
	})
})
