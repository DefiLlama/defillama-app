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

	it('returns the point closest to the 24h target within tolerance', () => {
		expect(
			getPrevTvlFromChart(
				[
					[new Date('2026-03-26T00:02:00Z').getTime(), 100],
					[new Date('2026-03-26T00:04:00Z').getTime(), 110],
					[new Date('2026-03-27T00:05:00Z').getTime(), 120]
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

	it('returns null when no point is close enough to the 24h target', () => {
		expect(
			getPrevTvlFromChart(
				[
					[new Date('2026-03-26T12:00:00Z').getTime(), 90],
					[new Date('2026-03-27T00:05:00Z').getTime(), 120]
				],
				1,
				new Date('2026-03-27T12:00:00Z').getTime()
			)
		).toBeNull()
	})
})
