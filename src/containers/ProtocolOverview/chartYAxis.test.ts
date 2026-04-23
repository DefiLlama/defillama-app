import { describe, expect, it } from 'vitest'
import { buildProtocolYAxis } from './chartYAxis'
import type { ProtocolChartsLabels } from './constants'

describe('buildProtocolYAxis', () => {
	it('uses native axis scaling for line-only axes', () => {
		const [axis] = buildProtocolYAxis({
			allYAxis: [['TVL', undefined]],
			baseYAxis: {},
			barAxisTypes: new Set<ProtocolChartsLabels>(),
			chartColors: { TVL: '#fff' },
			chartsInSeries: new Set(['TVL']),
			unlockTokenSymbol: ''
		})

		expect(axis.scale).toBe(true)
		expect(axis.min).toBeUndefined()
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
		expect(min({ min: -4, max: 8 })).toBe(-4)
		expect(axis.alignTicks).toBe(false)
	})

	it('keeps tick alignment for non-bar secondary axes', () => {
		const [, axis] = buildProtocolYAxis({
			allYAxis: [
				['TVL', undefined],
				['Open Interest', 1]
			],
			baseYAxis: {},
			barAxisTypes: new Set<ProtocolChartsLabels>(),
			chartColors: { TVL: '#fff', 'Open Interest': '#000' },
			chartsInSeries: new Set(['TVL', 'Open Interest']),
			unlockTokenSymbol: ''
		})

		expect(axis.alignTicks).toBe(true)
		expect(axis.scale).toBe(true)
		expect(axis.min).toBeUndefined()
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
