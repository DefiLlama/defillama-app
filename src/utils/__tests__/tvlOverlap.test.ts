import { describe, expect, it } from 'vitest'
import {
	calculateTotalWithExtraToggles,
	getEnabledExtraTvlApiKeys,
	getEnabledForkOracleExtraTvlChartApiKeys,
	getExtraTvlSeriesSign,
	shouldSubtractTvlOverlapSeries
} from '../tvlOverlap'

const TVL_VALUES = {
	tvl: 100,
	staking: 20,
	doublecounted: 30,
	liquidstaking: 40,
	dcAndLsOverlap: 10
}

describe('Oracle and Fork TVL overlap helpers', () => {
	it('requests overlap data only when both overlap parents are enabled', () => {
		expect(
			getEnabledExtraTvlApiKeys({
				tvl: true,
				staking: true,
				doublecounted: true,
				liquidstaking: false
			})
		).toEqual(['doublecounted', 'staking'])

		expect(
			getEnabledExtraTvlApiKeys({
				tvl: true,
				doublecounted: true,
				liquidstaking: true
			})
		).toEqual(['dcAndLsOverlap', 'doublecounted', 'liquidstaking'])
	})

	it('keeps Fork and Oracle chart query keys limited to backend-supported keys', () => {
		expect(
			getEnabledForkOracleExtraTvlChartApiKeys({
				tvl: true,
				staking: true,
				pool2: true,
				doublecounted: true,
				liquidstaking: true
			})
		).toEqual(['pool2', 'staking'])
	})

	it('adds enabled extras and subtracts overlap when both overlap parents are enabled', () => {
		expect(
			calculateTotalWithExtraToggles({
				values: TVL_VALUES,
				extraTvlsEnabled: {
					staking: true,
					doublecounted: true,
					liquidstaking: true
				}
			})
		).toBe(180)
	})

	it('does not subtract overlap when only one overlap parent is enabled', () => {
		expect(
			calculateTotalWithExtraToggles({
				values: TVL_VALUES,
				extraTvlsEnabled: {
					doublecounted: true,
					liquidstaking: false
				}
			})
		).toBe(130)
	})

	it('marks only overlap series negative when both overlap parents are enabled', () => {
		const shouldSubtractOverlapSeries = shouldSubtractTvlOverlapSeries([
			'dcAndLsOverlap',
			'doublecounted',
			'liquidstaking'
		])

		expect(shouldSubtractOverlapSeries).toBe(true)
		expect(getExtraTvlSeriesSign({ apiKey: 'dcAndLsOverlap', shouldSubtractOverlapSeries })).toBe(-1)
		expect(getExtraTvlSeriesSign({ apiKey: 'staking', shouldSubtractOverlapSeries })).toBe(1)
	})

	it('detects overlap parents from a set of enabled keys', () => {
		expect(shouldSubtractTvlOverlapSeries(new Set(['tvl', 'doublecounted', 'liquidstaking']))).toBe(true)
		expect(shouldSubtractTvlOverlapSeries(new Set(['tvl', 'doublecounted']))).toBe(false)
	})

	it('keeps overlap series positive when only one overlap parent is enabled', () => {
		const shouldSubtractOverlapSeries = shouldSubtractTvlOverlapSeries(['dcAndLsOverlap', 'doublecounted'])

		expect(shouldSubtractOverlapSeries).toBe(false)
		expect(getExtraTvlSeriesSign({ apiKey: 'dcAndLsOverlap', shouldSubtractOverlapSeries })).toBe(1)
	})
})
