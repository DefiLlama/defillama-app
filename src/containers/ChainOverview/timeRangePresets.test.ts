import { describe, expect, it } from 'vitest'
import { computeTimeRangePreset, TIME_RANGE_PRESETS } from './timeRangePresets'

const NOW = Date.UTC(2026, 0, 15) // 2026-01-15
const DAY = 24 * 60 * 60 * 1000

describe('computeTimeRangePreset', () => {
	it('returns full range for "All"', () => {
		expect(computeTimeRangePreset('All', NOW)).toEqual({ kind: 'percent', start: 0, end: 100 })
	})

	it('returns last 7 days for "7d"', () => {
		expect(computeTimeRangePreset('7d', NOW)).toEqual({
			kind: 'absolute',
			startValue: NOW - 7 * DAY,
			endValue: NOW
		})
	})

	it('returns last 30 days for "30d"', () => {
		expect(computeTimeRangePreset('30d', NOW)).toEqual({
			kind: 'absolute',
			startValue: NOW - 30 * DAY,
			endValue: NOW
		})
	})

	it('returns last 90 days for "90d"', () => {
		expect(computeTimeRangePreset('90d', NOW)).toEqual({
			kind: 'absolute',
			startValue: NOW - 90 * DAY,
			endValue: NOW
		})
	})

	it('returns last 365 days for "1y"', () => {
		expect(computeTimeRangePreset('1y', NOW)).toEqual({
			kind: 'absolute',
			startValue: NOW - 365 * DAY,
			endValue: NOW
		})
	})

	it('exports the canonical preset list', () => {
		expect(TIME_RANGE_PRESETS).toEqual(['7d', '30d', '90d', '1y', 'All'])
	})
})
