import { describe, expect, it } from 'vitest'
import { buildChainYAxis } from './chartYAxis'
import type { ChainChartLabels } from './constants'

describe('buildChainYAxis', () => {
	it('auto-fits line-only axes', () => {
		const [axis] = buildChainYAxis({
			allYAxis: [['TVL', undefined]],
			baseYAxis: {},
			barAxisTypes: new Set<ChainChartLabels>(),
			chartColors: { TVL: '#fff' },
			chartsInSeries: new Set(['TVL']),
			isThemeDark: false
		})

		const min = axis.min as (extent: { min?: number; max?: number }) => number | undefined
		expect(min({ min: 4, max: 8 })).toBe(3.8)
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
