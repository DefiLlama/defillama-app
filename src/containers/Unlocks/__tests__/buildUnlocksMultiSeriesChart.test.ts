import { describe, expect, it } from 'vitest'
import { buildUnlocksMultiSeriesChartForDateRange } from '../buildUnlocksMultiSeriesChart'

describe('buildUnlocksMultiSeriesChartForDateRange', () => {
	it('builds stacked unlock bars outside ECharts large mode', () => {
		const result = buildUnlocksMultiSeriesChartForDateRange({
			dates: ['2026-01-01', '2026-01-02'],
			unlocksData: {
				'2026-01-01': {
					events: [
						{ protocol: 'Alpha', value: 10 },
						{ protocol: 'Beta', value: 5 }
					]
				},
				'2026-01-02': {
					events: [{ protocol: 'Alpha', value: 3 }]
				}
			}
		})

		expect(result.charts).toHaveLength(2)
		expect(result.charts.every((chart) => chart.type === 'bar' && chart.stack === 'unlocks')).toBe(true)
		expect(result.charts.every((chart) => chart.large === false)).toBe(true)
		expect(result.dataset.dimensions).toEqual(['timestamp', 'Alpha', 'Beta'])
	})
})
