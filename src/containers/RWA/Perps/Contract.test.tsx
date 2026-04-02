import { describe, expect, it } from 'vitest'
import {
	getRWAPerpsContractChartGroup,
	getRWAPerpsContractEnabledMetrics,
	getRWAPerpsContractGroupByQueryPatch,
	getRWAPerpsContractMetricQueryPatch
} from './Contract'

describe('Contract helpers', () => {
	it('normalizes invalid or missing groupBy values back to daily', () => {
		expect(getRWAPerpsContractChartGroup(null)).toBe('daily')
		expect(getRWAPerpsContractChartGroup('weekly')).toBe('weekly')
		expect(getRWAPerpsContractChartGroup('cumulative')).toBe('daily')
		expect(getRWAPerpsContractChartGroup('bad-value')).toBe('daily')
	})

	it('derives enabled metrics from URLSearchParams state', () => {
		const params = new URLSearchParams({
			oi: 'false',
			vol24h: 'true',
			funding: 'true'
		})

		expect(getRWAPerpsContractEnabledMetrics(params)).toEqual(['volume24h', 'price', 'fundingRate'])
	})

	it('builds metric and groupBy query patches for interactive controls', () => {
		expect(
			getRWAPerpsContractMetricQueryPatch({
				metric: { queryKey: 'funding', defaultEnabled: false },
				isActive: false
			})
		).toEqual({ funding: 'true' })

		expect(
			getRWAPerpsContractMetricQueryPatch({
				metric: { queryKey: 'oi', defaultEnabled: true },
				isActive: true
			})
		).toEqual({ oi: 'false' })

		expect(getRWAPerpsContractGroupByQueryPatch('daily')).toEqual({ groupBy: undefined })
		expect(getRWAPerpsContractGroupByQueryPatch('monthly')).toEqual({ groupBy: 'monthly' })
	})
})
