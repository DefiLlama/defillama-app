import { describe, expect, it } from 'vitest'
import type { IChainOverviewData } from '~/containers/ChainOverview/types'
import { buildCompareChainsTvlChartState } from '../tvlChart'

const DAY_MS = 24 * 60 * 60 * 1000
const getTodayTimestamp = () => {
	const now = new Date()
	return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 5)
}

const LATEST_TIMESTAMP = getTodayTimestamp()
const PREVIOUS_TIMESTAMP = LATEST_TIMESTAMP - DAY_MS

const TVL_CHART: Array<[number, number]> = [
	[PREVIOUS_TIMESTAMP, 100],
	[LATEST_TIMESTAMP, 200]
]

const makeExtraTvlCharts = (
	overrides: Partial<IChainOverviewData['extraTvlCharts']> = {}
): IChainOverviewData['extraTvlCharts'] => ({
	staking: {},
	borrowed: {},
	pool2: {},
	vesting: {},
	offers: {},
	doublecounted: {},
	liquidstaking: {},
	dcAndLsOverlap: {},
	...overrides
})

describe('CompareChains TVL chart helper', () => {
	it('reuses the base chart and recomputes summary values when no TVL extras are enabled', () => {
		const result = buildCompareChainsTvlChartState({
			tvlChart: TVL_CHART,
			tvlSettings: {},
			extraTvlCharts: makeExtraTvlCharts({
				staking: { [String(LATEST_TIMESTAMP)]: 50 }
			})
		})

		expect(result.finalTvlChart).toBe(TVL_CHART)
		expect(result.totalValueUSD).toBe(200)
		expect(result.valueChange24hUSD).toBe(100)
		expect(result.change24h).toBe(100)
		expect(result.isGovTokensEnabled).toBeUndefined()
	})

	it('adds enabled extras, subtracts overlap, and recomputes summary values', () => {
		expect(
			buildCompareChainsTvlChartState({
				tvlChart: TVL_CHART,
				tvlSettings: {
					doublecounted: true,
					liquidstaking: true
				},
				extraTvlCharts: makeExtraTvlCharts({
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
				})
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

	it('subtracts nothing when both overlap parents are enabled but overlap data is missing', () => {
		expect(
			buildCompareChainsTvlChartState({
				tvlChart: TVL_CHART,
				tvlSettings: {
					doublecounted: true,
					liquidstaking: true
				},
				extraTvlCharts: makeExtraTvlCharts({
					doublecounted: {
						[String(PREVIOUS_TIMESTAMP)]: 10,
						[String(LATEST_TIMESTAMP)]: 20
					},
					liquidstaking: {
						[String(PREVIOUS_TIMESTAMP)]: 30,
						[String(LATEST_TIMESTAMP)]: 40
					}
				})
			}).finalTvlChart
		).toEqual([
			[PREVIOUS_TIMESTAMP, 140],
			[LATEST_TIMESTAMP, 260]
		])
	})

	it('does not subtract overlap when only one overlap parent is enabled', () => {
		expect(
			buildCompareChainsTvlChartState({
				tvlChart: TVL_CHART,
				tvlSettings: {
					doublecounted: true
				},
				extraTvlCharts: makeExtraTvlCharts({
					doublecounted: {
						[String(PREVIOUS_TIMESTAMP)]: 10,
						[String(LATEST_TIMESTAMP)]: 20
					},
					dcAndLsOverlap: {
						[String(PREVIOUS_TIMESTAMP)]: 5,
						[String(LATEST_TIMESTAMP)]: 10
					}
				})
			}).finalTvlChart
		).toEqual([
			[PREVIOUS_TIMESTAMP, 110],
			[LATEST_TIMESTAMP, 220]
		])
	})

	it('exposes the gov-token enabled flag', () => {
		expect(
			buildCompareChainsTvlChartState({
				tvlChart: TVL_CHART,
				tvlSettings: {
					govtokens: true
				},
				extraTvlCharts: makeExtraTvlCharts()
			})
		).toMatchObject({
			finalTvlChart: [
				[PREVIOUS_TIMESTAMP, 100],
				[LATEST_TIMESTAMP, 200]
			],
			isGovTokensEnabled: true
		})
	})
})
