import { describe, expect, it } from 'vitest'
import { buildProtocolYAxis } from './chartYAxis'
import type { ProtocolChartsLabels } from './constants'

describe('buildProtocolYAxis', () => {
	it('auto-fits line-only axes', () => {
		const [axis] = buildProtocolYAxis({
			allYAxis: [['TVL', undefined]],
			baseYAxis: {},
			barAxisTypes: new Set<ProtocolChartsLabels>(),
			chartColors: { TVL: '#fff' },
			chartsInSeries: new Set(['TVL']),
			unlockTokenSymbol: ''
		})

		const min = axis.min as (extent: { min?: number; max?: number }) => number | undefined
		expect(min({ min: 4, max: 8 })).toBe(3.8)
	})

	it('keeps zero baseline for bar-backed axes', () => {
		const [axis] = buildProtocolYAxis({
			allYAxis: [['Fees', undefined]],
			baseYAxis: {},
			barAxisTypes: new Set<ProtocolChartsLabels>(['Fees']),
			chartColors: { Fees: '#fff' },
			chartsInSeries: new Set(['Fees']),
			unlockTokenSymbol: ''
		})

		const min = axis.min as (extent: { min?: number; max?: number }) => number | undefined
		expect(min({ min: 4, max: 8 })).toBe(0)
	})

	it('keeps the empty fallback zero-based', () => {
		const [axis] = buildProtocolYAxis({
			allYAxis: [],
			baseYAxis: {},
			barAxisTypes: new Set<ProtocolChartsLabels>(),
			chartColors: {},
			chartsInSeries: new Set(),
			unlockTokenSymbol: ''
		})

		const min = axis.min as (extent: { min?: number; max?: number }) => number | undefined
		expect(min({ min: 4, max: 8 })).toBe(0)
	})
})
