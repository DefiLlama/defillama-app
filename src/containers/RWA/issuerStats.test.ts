import { describe, expect, it } from 'vitest'
import { computeHHI, computeNakamotoCoefficient, computeTopNShare } from './issuerStats'

describe('issuerStats', () => {
	describe('computeHHI', () => {
		it('returns 0 for empty or non-positive input', () => {
			expect(computeHHI([])).toBe(0)
			expect(computeHHI([0, 0])).toBe(0)
			expect(computeHHI([-1, -2])).toBe(0)
		})

		it('matches expected values for simple distributions', () => {
			// 100% in one issuer
			expect(computeHHI([10])).toBeCloseTo(1)
			// 50/50 split
			expect(computeHHI([1, 1])).toBeCloseTo(0.5)
			// 80/20 split
			expect(computeHHI([8, 2])).toBeCloseTo(0.8 * 0.8 + 0.2 * 0.2)
		})

		it('treats negative and non-finite values as zero shares', () => {
			expect(computeHHI([10, -5, 10])).toBeCloseTo(0.5)
			expect(computeHHI([10, Number.NaN, Number.POSITIVE_INFINITY, 10])).toBeCloseTo(0.5)
		})

		it('is invariant to absolute scale (only relative shares matter)', () => {
			expect(computeHHI([3, 1])).toBeCloseTo(computeHHI([300, 100]))
		})
	})

	describe('computeTopNShare', () => {
		it('handles empty arrays and non-positive N', () => {
			expect(computeTopNShare([], 5)).toBe(0)
			expect(computeTopNShare([1, 2, 3], 0)).toBe(0)
			expect(computeTopNShare([1, 2, 3], -1)).toBe(0)
		})

		it('caps at the total share when N exceeds the array length', () => {
			expect(computeTopNShare([10, 0], 1)).toBeCloseTo(1)
			expect(computeTopNShare([3, 7], 99)).toBeCloseTo(1)
		})

		it('uses the largest entries regardless of input order', () => {
			expect(computeTopNShare([8, 2, 1], 2)).toBeCloseTo(10 / 11)
			expect(computeTopNShare([1, 8, 2], 2)).toBeCloseTo(10 / 11)
		})
	})

	describe('computeNakamotoCoefficient', () => {
		it('returns 0 for empty input regardless of threshold', () => {
			expect(computeNakamotoCoefficient([], 0.5)).toBe(0)
			expect(computeNakamotoCoefficient([], 0.1)).toBe(0)
		})

		it('returns 1 for a non-positive threshold', () => {
			expect(computeNakamotoCoefficient([10, 10], 0)).toBe(1)
			expect(computeNakamotoCoefficient([10, 10], -0.5)).toBe(1)
		})

		it('returns the minimal N whose cumulative share crosses the threshold', () => {
			expect(computeNakamotoCoefficient([1], 0.5)).toBe(1)
			expect(computeNakamotoCoefficient([50, 50], 0.5)).toBe(1)
			expect(computeNakamotoCoefficient([40, 30, 30], 0.5)).toBe(2)
			expect(computeNakamotoCoefficient([49, 1, 50], 0.5)).toBe(1)
		})

		it('falls back to the total entry count when the threshold is unreachable in a finite list', () => {
			// All-zero shares can never accumulate to 0.5; result should be the full count.
			expect(computeNakamotoCoefficient([0, 0, 0], 0.5)).toBe(3)
		})

		it('handles ties deterministically (any one issuer suffices for >=50% on a 3-way tie)', () => {
			// Three equal shares of ~0.333 — first crosses 0.5 at N=2.
			expect(computeNakamotoCoefficient([1, 1, 1], 0.5)).toBe(2)
		})
	})
})
