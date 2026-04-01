import { describe, expect, it } from 'vitest'
import {
	getRWAPerpsCoinChartGroup,
	getRWAPerpsCoinEnabledMetrics,
	getRWAPerpsCoinGroupByQueryPatch,
	getRWAPerpsCoinMetricQueryPatch
} from './Coin'

describe('Coin helpers', () => {
	it('normalizes invalid or missing groupBy values back to daily', () => {
		expect(getRWAPerpsCoinChartGroup(null)).toBe('daily')
		expect(getRWAPerpsCoinChartGroup('weekly')).toBe('weekly')
		expect(getRWAPerpsCoinChartGroup('bad-value')).toBe('daily')
	})

	it('derives enabled metrics from URLSearchParams state', () => {
		const params = new URLSearchParams({
			oi: 'false',
			vol24h: 'true',
			funding: 'true'
		})

		expect(getRWAPerpsCoinEnabledMetrics(params)).toEqual(['volume24h', 'price', 'fundingRate'])
	})

	it('builds metric and groupBy query patches for interactive controls', () => {
		expect(
			getRWAPerpsCoinMetricQueryPatch({
				metric: { queryKey: 'funding', defaultEnabled: false },
				isActive: false
			})
		).toEqual({ funding: 'true' })

		expect(
			getRWAPerpsCoinMetricQueryPatch({
				metric: { queryKey: 'oi', defaultEnabled: true },
				isActive: true
			})
		).toEqual({ oi: 'false' })

		expect(getRWAPerpsCoinGroupByQueryPatch('daily')).toEqual({ groupBy: undefined })
		expect(getRWAPerpsCoinGroupByQueryPatch('monthly')).toEqual({ groupBy: 'monthly' })
	})
})
