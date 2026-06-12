import { describe, expect, it } from 'vitest'
import { buildDimensionProtocolMetrics } from '../readModel'

const metricRow = (defillamaId: string, totals: Record<string, number | null>) =>
	({
		defillamaId,
		total24h: totals.total24h ?? null,
		total7d: totals.total7d ?? null,
		total30d: totals.total30d ?? null,
		total1y: totals.total1y ?? null,
		annualized1y: totals.annualized1y ?? null,
		monthlyAverage1y: totals.monthlyAverage1y ?? null,
		totalAllTime: totals.totalAllTime ?? null,
		change_7dover7d: totals.change_7dover7d ?? null
	}) as any

describe('buildDimensionProtocolMetrics', () => {
	it('keeps rows with any displayed totals and preserves dimension fields', () => {
		expect(
			buildDimensionProtocolMetrics({
				fees: {
					protocols: [
						metricRow('kept', {
							total24h: 10,
							total7d: 70,
							total30d: 300,
							total1y: 3000,
							annualized1y: 3650,
							monthlyAverage1y: 250,
							totalAllTime: 5000
						}),
						metricRow('kept-without-24h', { total24h: null, total7d: 70, annualized1y: 3650 }),
						metricRow('skipped', { total24h: null, annualized1y: null })
					]
				} as any,
				revenue: {
					protocols: [
						metricRow('kept', { total24h: 4, total7d: 28, annualized1y: null }),
						metricRow('kept-without-24h', { total24h: null, total30d: 300 })
					]
				} as any,
				holdersRevenue: {
					protocols: [
						metricRow('kept', { total24h: 2, total7d: 14, totalAllTime: 100 }),
						metricRow('kept-without-24h', { total24h: null, totalAllTime: 1000 })
					]
				} as any,
				dexs: {
					protocols: [
						metricRow('kept', { total24h: 20, total7d: 140, change_7dover7d: 12, totalAllTime: 900 }),
						metricRow('kept-without-24h', { total24h: null, total7d: 700, change_7dover7d: 10 })
					]
				} as any
			})
		).toEqual({
			kept: {
				fees: {
					total24h: 10,
					total7d: 70,
					total30d: 300,
					total1y: 3000,
					annualized1y: 3650,
					monthlyAverage1y: 250,
					totalAllTime: 5000
				},
				revenue: {
					total24h: 4,
					total7d: 28,
					total30d: null,
					total1y: null,
					annualized1y: null,
					monthlyAverage1y: null,
					totalAllTime: null
				},
				holdersRevenue: {
					total24h: 2,
					total7d: 14,
					total30d: null,
					total1y: null,
					monthlyAverage1y: null,
					totalAllTime: 100
				},
				dexs: {
					total24h: 20,
					total7d: 140,
					change_7dover7d: 12,
					totalAllTime: 900
				}
			},
			'kept-without-24h': {
				fees: {
					total24h: null,
					total7d: 70,
					total30d: null,
					total1y: null,
					annualized1y: 3650,
					monthlyAverage1y: null,
					totalAllTime: null
				},
				revenue: {
					total24h: null,
					total7d: null,
					total30d: 300,
					total1y: null,
					annualized1y: null,
					monthlyAverage1y: null,
					totalAllTime: null
				},
				holdersRevenue: {
					total24h: null,
					total7d: null,
					total30d: null,
					total1y: null,
					monthlyAverage1y: null,
					totalAllTime: 1000
				},
				dexs: {
					total24h: null,
					total7d: 700,
					change_7dover7d: 10,
					totalAllTime: null
				}
			}
		})
	})
})
