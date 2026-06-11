import { describe, expect, it } from 'vitest'
import { CHART_TYPES } from '../types'

describe('ProDashboard chart type labels', () => {
	it('labels historical P/F and P/S chart series as 30d run-rate ratios', () => {
		expect(CHART_TYPES.pfRatio.title).toBe('P/F Ratio (30d Run Rate)')
		expect(CHART_TYPES.psRatio.title).toBe('P/S Ratio (30d Run Rate)')
	})
})
