import { describe, expect, it } from 'vitest'
import type { NormalizedRow } from '../types'
import { aggregateMetrics } from './aggregation'

describe('aggregateMetrics fee ratios', () => {
	it('uses summed annualized fee and revenue fields for P/F and P/S', () => {
		const rows: NormalizedRow[] = [
			{
				id: 'one',
				name: 'One',
				protocolId: 'one',
				metrics: {
					mcap: 12_000,
					fees_30d: 3000,
					feesAnnualized1y: 60_000,
					revenue_30d: 1000,
					revenueAnnualized1y: null
				}
			}
		]

		const result = aggregateMetrics(rows)

		expect(result.pf).toBe(0.2)
		expect(result.ps).toBeNull()
	})
})
