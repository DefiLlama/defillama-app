import { describe, expect, it } from 'vitest'
import { toUnixMsTimestamp } from '../api'

describe('RWA api timestamp normalization', () => {
	it('keeps unix seconds versus milliseconds behavior unchanged', () => {
		expect(toUnixMsTimestamp(1_774_483_200)).toBe(1_774_483_200_000)
		expect(toUnixMsTimestamp(1_774_483_200_000)).toBe(1_774_483_200_000)
	})
})
