import { describe, expect, it } from 'vitest'
import { getAdjustedTotals } from '../helpers'

describe('getAdjustedTotals', () => {
	it('includes enabled trailing 12-month extra revenue when base trailing 12-month revenue is missing', () => {
		const result = getAdjustedTotals(
			{ total30d: 300, total1y: null },
			{ total1y: 700 },
			{ total1y: 200 },
			{ bribes: true, tokentax: true }
		)

		expect(result?.total1y).toBe(900)
	})

	it('keeps trailing 12-month totals null when no selected source has that period', () => {
		const result = getAdjustedTotals(
			{ total30d: 300, total1y: null },
			{ total1y: 700 },
			{ total1y: 200 },
			{ bribes: false, tokentax: false }
		)

		expect(result?.total1y).toBeNull()
	})
})
