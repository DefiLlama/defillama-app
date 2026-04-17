import { describe, expect, it } from 'vitest'
import {
	getAutoFitYAxisMin,
	getDefaultYAxisMinForSeriesTypes,
	getRenderedSeriesTypesByYAxisIndex,
	getZeroBaselineYAxisMin
} from './axisMin'

describe('axisMin helpers', () => {
	it('returns a padded data min for positive finite ranges', () => {
		expect(getAutoFitYAxisMin({ min: 4, max: 8 })).toBe(3.8)
	})

	it('falls back safely for flat or invalid ranges', () => {
		expect(getAutoFitYAxisMin({ min: 4, max: 4 })).toBe(4)
		expect(Number.isNaN(getAutoFitYAxisMin({ min: Number.NaN, max: 8 }))).toBe(true)
	})

	it('keeps zero baseline for any axis with a bar series', () => {
		expect(getDefaultYAxisMinForSeriesTypes(['line', 'bar'])).toBe(getZeroBaselineYAxisMin)
		expect(getDefaultYAxisMinForSeriesTypes(['bar'])).toBe(getZeroBaselineYAxisMin)
	})

	it('auto-fits line-only axes', () => {
		expect(getDefaultYAxisMinForSeriesTypes(['line'])).toBe(getAutoFitYAxisMin)
	})

	it('groups rendered series types by y-axis index', () => {
		const seriesTypesByAxis = getRenderedSeriesTypesByYAxisIndex([
			{ type: 'line' as const },
			{ type: 'bar' as const, yAxisIndex: 1 },
			{ type: 'line' as const, yAxisIndex: 1 }
		])

		expect(Array.from(seriesTypesByAxis.get(0) ?? [])).toEqual(['line'])
		expect(Array.from(seriesTypesByAxis.get(1) ?? []).sort()).toEqual(['bar', 'line'])
	})
})
