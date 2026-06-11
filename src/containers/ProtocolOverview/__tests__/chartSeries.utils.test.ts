import { describe, expect, it } from 'vitest'
import { normalizeSeriesToMilliseconds, normalizeSeriesToSeconds } from '../chartSeries.utils'

describe('ProtocolOverview chart series normalization', () => {
	it('normalizes mixed second and millisecond timestamps to sorted seconds', () => {
		expect(
			normalizeSeriesToSeconds([
				[1_700_000_100_000, 2],
				[1_700_000_000, 1]
			])
		).toEqual([
			[1_700_000_000, 1],
			[1_700_000_100, 2]
		])
	})

	it('normalizes mixed second and millisecond timestamps to sorted milliseconds', () => {
		expect(
			normalizeSeriesToMilliseconds([
				[1_700_000_100, 2],
				[1_700_000_000_000, 1]
			])
		).toEqual([
			[1_700_000_000_000, 1],
			[1_700_000_100_000, 2]
		])
	})
})
