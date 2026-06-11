import { describe, expect, it } from 'vitest'
import { addFeeExtrasToRowTotals, addOptionalFeeExtraTotal, mergeFeeExtraSeries } from '../feeExtras'

describe('fee extra helpers', () => {
	it('uses enabled extras as the total when the base period is missing', () => {
		expect(addOptionalFeeExtraTotal(null, 10)).toBe(10)
		expect(addOptionalFeeExtraTotal(undefined, 10)).toBe(10)
		expect(addOptionalFeeExtraTotal(null, 0)).toBeNull()
		expect(addOptionalFeeExtraTotal(100, 10)).toBe(110)

		expect(
			addFeeExtrasToRowTotals(
				{
					total24h: null,
					total7d: 700,
					bribes: { total24h: 20, total7d: 70 },
					tokenTax: { total24h: 3, total7d: 7 }
				},
				{ bribes: true, tokentax: true }
			)
		).toMatchObject({
			total24h: 23,
			total7d: 777
		})
	})

	it('merges extras into base series and keeps extras-only timestamps', () => {
		expect(
			mergeFeeExtraSeries({
				base: [
					[1, 100],
					[2, 200]
				],
				extraCharts: [
					[
						[1, 10],
						[3, 30]
					],
					[[2, 20]]
				]
			})
		).toEqual([
			[1, 110],
			[2, 220],
			[3, 30]
		])
	})
})
