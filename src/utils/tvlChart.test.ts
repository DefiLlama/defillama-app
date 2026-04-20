import { describe, expect, it } from 'vitest'
import { getPrevTvlFromChart } from './tvlChart'

describe('getPrevTvlFromChart', () => {
	it('returns the latest chart value for day zero', () => {
		expect(
			getPrevTvlFromChart(
				[
					[1774483200, 100],
					[1774526400, 110]
				],
				0,
				new Date('2026-03-25T12:00:00Z').getTime()
			)
		).toBe(110)
	})

	it('returns the latest point inside the requested UTC day window', () => {
		expect(
			getPrevTvlFromChart(
				[
					[1774483200, 100],
					[1774526400, 110],
					[1774569600, 120]
				],
				1,
				new Date('2026-03-27T12:00:00Z').getTime()
			)
		).toBe(110)
	})

	it('returns null when the latest chart point is stale', () => {
		expect(
			getPrevTvlFromChart(
				[
					[1774396800, 90],
					[1774483200, 100]
				],
				1,
				new Date('2026-03-27T12:00:00Z').getTime()
			)
		).toBeNull()
	})

	it('returns null when the requested previous day is missing', () => {
		expect(
			getPrevTvlFromChart(
				[
					[1774396800, 90],
					[1774569600, 120]
				],
				1,
				new Date('2026-03-27T12:00:00Z').getTime()
			)
		).toBeNull()
	})
})
