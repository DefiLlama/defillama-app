import { describe, expect, it } from 'vitest'
import { buildChainYAxis } from './chartYAxis'
import type { ChainChartLabels } from './constants'

describe('buildChainYAxis', () => {
	it('uses native axis scaling for line-only axes', () => {
		const [axis] = buildChainYAxis({
			allYAxis: [['TVL', undefined]],
			baseYAxis: {},
			barAxisTypes: new Set<ChainChartLabels>(),
			chartColors: { TVL: '#fff' },
			chartsInSeries: new Set(['TVL']),
			isThemeDark: false
		})

		expect(axis.scale).toBe(true)
		expect(axis.min).toBeUndefined()
	})

	it('keeps zero baseline for bar-backed axes', () => {
		const [axis] = buildChainYAxis({
			allYAxis: [['DEXs Volume', undefined]],
			baseYAxis: {},
			barAxisTypes: new Set<ChainChartLabels>(['DEXs Volume']),
			chartColors: { 'DEXs Volume': '#fff' },
			chartsInSeries: new Set(['DEXs Volume']),
			isThemeDark: false
		})

		const min = axis.min as (extent: { min?: number; max?: number }) => number | undefined
		expect(min({ min: 4, max: 8 })).toBe(0)
		expect(min({ min: -4, max: 8 })).toBe(-4)
		expect(axis.alignTicks).toBe(false)
	})

	it('keeps tick alignment for non-bar secondary axes', () => {
		const [, axis] = buildChainYAxis({
			allYAxis: [
				['TVL', undefined],
				['Stablecoins Mcap', 1]
			],
			baseYAxis: {},
			barAxisTypes: new Set<ChainChartLabels>(),
			chartColors: { TVL: '#fff', 'Stablecoins Mcap': '#000' },
			chartsInSeries: new Set(['TVL', 'Stablecoins Mcap']),
			isThemeDark: false
		})

		expect(axis.alignTicks).toBe(true)
		expect(axis.scale).toBe(true)
		expect(axis.min).toBeUndefined()
	})

	it('keeps the empty fallback zero-based', () => {
		const [axis] = buildChainYAxis({
			allYAxis: [],
			baseYAxis: {},
			barAxisTypes: new Set<ChainChartLabels>(),
			chartColors: {},
			chartsInSeries: new Set(),
			isThemeDark: false
		})

		const min = axis.min as (extent: { min?: number; max?: number }) => number | undefined
		expect(min({ min: 4, max: 8 })).toBe(0)
	})
})
