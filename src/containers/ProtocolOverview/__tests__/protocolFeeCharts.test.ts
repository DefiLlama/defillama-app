import { describe, expect, it } from 'vitest'
import { mergeProtocolFeeExtraChartSeries } from '../protocolFeeCharts'

describe('mergeProtocolFeeExtraChartSeries', () => {
	it('adds both enabled fee extras without overwriting the previous extra', () => {
		expect(
			mergeProtocolFeeExtraChartSeries({
				base: [
					[1, 100],
					[2, 200]
				],
				bribeRevenue: { 1: 10, 3: 30 },
				tokenTax: { 1: 3, 2: 20 },
				includeBribes: true,
				includeTokenTax: true
			})
		).toEqual([
			[1, 113],
			[2, 220],
			[3, 30]
		])
	})

	it('respects disabled fee-extra toggles', () => {
		expect(
			mergeProtocolFeeExtraChartSeries({
				base: [[1, 100]],
				bribeRevenue: { 1: 10 },
				tokenTax: { 1: 3 },
				includeBribes: false,
				includeTokenTax: true
			})
		).toEqual([[1, 103]])
	})
})
