import { describe, expect, it } from 'vitest'
import { getRWATimeSeriesChartState } from './constants'

describe('getRWATimeSeriesChartState', () => {
	it('falls back to the chain default when the query value is invalid', () => {
		expect(getRWATimeSeriesChartState('chain', 'assetName')).toEqual({
			mode: 'chain',
			breakdown: 'assetGroup'
		})
	})

	it('keeps the valid category breakdown options', () => {
		expect(getRWATimeSeriesChartState('category', 'platform')).toEqual({
			mode: 'category',
			breakdown: 'platform'
		})
	})

	it('falls back to the platform default when the query value is invalid', () => {
		expect(getRWATimeSeriesChartState('platform', 'platform')).toEqual({
			mode: 'platform',
			breakdown: 'assetGroup'
		})
	})
})
