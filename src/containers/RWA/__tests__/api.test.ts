import { describe, expect, it } from 'vitest'
import { toUnixMsTimestamp } from '../api'

describe('RWA api timestamp normalization', () => {
	it('keeps unix seconds versus milliseconds behavior unchanged', () => {
		expect(toUnixMsTimestamp(1_774_483_200)).toBe(1_774_483_200_000)
		expect(toUnixMsTimestamp(1_774_483_200_000)).toBe(1_774_483_200_000)
	})

	it('preserves malformed timestamp outputs at the raw timestamp boundary', () => {
		expect(toUnixMsTimestamp(Number.NaN)).toBeNaN()
		expect(toUnixMsTimestamp(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
	})
})
