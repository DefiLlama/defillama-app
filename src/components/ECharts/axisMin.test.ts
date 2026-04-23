import { describe, expect, it } from 'vitest'
import { getRenderedSeriesTypesByYAxisIndex, getZeroBaselineYAxisMin } from './axisMin'

describe('axisMin helpers', () => {
	it('keeps zero baseline for positive-only bar extents and preserves negative minima', () => {
		expect(getZeroBaselineYAxisMin({ min: 4, max: 8 })).toBe(0)
		expect(getZeroBaselineYAxisMin({ min: -4, max: 8 })).toBe(-4)
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
