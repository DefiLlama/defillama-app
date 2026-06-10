import { describe, expect, it } from 'vitest'
import {
	buildExtraTvlCharts,
	buildTvlChart,
	buildUsdInflowsFromTvlChart,
	getProtocolExtraTvlChartFetchState
} from '../tvlChart'

const DAY = 24 * 60 * 60

const toMs = (timestampSec: number) => timestampSec * 1e3

describe('ProtocolOverview TVL chart helpers', () => {
	it('keeps staking and borrowed standalone fetch behavior separate from composite-only extras', () => {
		expect(
			getProtocolExtraTvlChartFetchState({
				isRouterReady: true,
				currentTvlByChain: {
					staking: 1,
					borrowed: 1,
					pool2: 1,
					vesting: 1,
					govtokens: 1
				},
				tvlSettings: {
					staking: true,
					borrowed: true,
					pool2: true,
					doublecounted: true,
					liquidstaking: true,
					vesting: true,
					govtokens: true
				},
				needsCompositeTvlChart: false,
				isStakingTvlToggled: true,
				isBorrowedTvlToggled: true
			})
		).toEqual({
			staking: true,
			borrowed: true,
			pool2: false,
			doublecounted: false,
			liquidstaking: false,
			vesting: false,
			govtokens: false
		})
	})

	it('requires composite TVL, enabled settings, and current TVL keys for non-standalone extras', () => {
		expect(
			getProtocolExtraTvlChartFetchState({
				isRouterReady: true,
				currentTvlByChain: {
					staking: 1,
					borrowed: 1,
					pool2: 1,
					vesting: 1
				},
				tvlSettings: {
					staking: true,
					borrowed: true,
					pool2: true,
					doublecounted: true,
					liquidstaking: true,
					vesting: true,
					govtokens: true
				},
				needsCompositeTvlChart: true,
				isStakingTvlToggled: false,
				isBorrowedTvlToggled: false
			})
		).toEqual({
			staking: true,
			borrowed: true,
			pool2: true,
			doublecounted: false,
			liquidstaking: false,
			vesting: true,
			govtokens: false
		})
	})

	it('adds selected extra charts only when the protocol exposes the current TVL key', () => {
		const extraTvlCharts = buildExtraTvlCharts({
			staking: [
				[DAY, 10],
				[DAY * 2, 20]
			],
			pool2: [
				[DAY, 50],
				[DAY * 2, 60]
			],
			borrowed: [
				[DAY, 5],
				[DAY * 2, 6]
			]
		})

		expect(
			buildTvlChart({
				tvlChartData: [
					[DAY, 100],
					[DAY * 2, 200]
				],
				extraTvlCharts,
				tvlSettings: { staking: true, pool2: true, borrowed: true },
				currentTvlByChain: { staking: 1, pool2: 1 },
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(DAY), 160],
			[toMs(DAY * 2), 280]
		])
	})

	it('aligns the latest base TVL timestamp to a nearby latest extra TVL timestamp', () => {
		const shiftedLatestTimestamp = DAY * 2 + 60 * 60
		const extraTvlCharts = buildExtraTvlCharts({
			staking: [
				[DAY, 10],
				[shiftedLatestTimestamp, 20]
			]
		})

		expect(
			buildTvlChart({
				tvlChartData: [
					[DAY, 100],
					[DAY * 2, 200]
				],
				extraTvlCharts,
				tvlSettings: { staking: true },
				currentTvlByChain: { staking: 1 },
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(DAY), 110],
			[toMs(shiftedLatestTimestamp), 220]
		])
	})

	it('keeps the base timestamp but still adds the latest extra value when latest timestamps are far apart', () => {
		const extraTvlCharts = buildExtraTvlCharts({
			staking: [
				[DAY, 10],
				[DAY * 3 + 1, 20]
			]
		})

		expect(
			buildTvlChart({
				tvlChartData: [
					[DAY, 100],
					[DAY * 2, 200]
				],
				extraTvlCharts,
				tvlSettings: { staking: true },
				currentTvlByChain: { staking: 1 },
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(DAY), 110],
			[toMs(DAY * 2), 220]
		])
	})

	it('drops denominated points only when denomination history exists and lacks the retained timestamp rate', () => {
		const extraTvlCharts = buildExtraTvlCharts({
			staking: [
				[DAY, 10],
				[DAY * 2, 20]
			]
		})
		const input = {
			tvlChartData: [
				[DAY, 100],
				[DAY * 2, 200]
			] as Array<[number, number]>,
			extraTvlCharts,
			tvlSettings: { staking: true },
			currentTvlByChain: { staking: 1 },
			groupBy: 'cumulative' as const
		}

		expect(buildTvlChart({ ...input, denominationPriceHistory: { [String(DAY)]: 10 } })).toEqual([[toMs(DAY), 11]])
		expect(buildTvlChart({ ...input, denominationPriceHistory: null })).toEqual([
			[toMs(DAY), 110],
			[toMs(DAY * 2), 220]
		])
	})

	it('derives USD inflows from adjacent non-null TVL chart points', () => {
		expect(
			buildUsdInflowsFromTvlChart([
				[toMs(DAY), 100],
				[toMs(DAY * 2), 130],
				[toMs(DAY * 3), null],
				[toMs(DAY * 4), 160]
			])
		).toEqual([[DAY * 2, 30]])
	})
})
