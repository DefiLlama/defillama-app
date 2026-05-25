import { describe, expect, it } from 'vitest'
import {
	normalizeChartDataByKey,
	normalizeDashboardChartData,
	normalizeDashboardItems
} from '~/containers/LlamaAI/chartPayloads'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'

const chartConfig: ChartConfiguration = {
	id: 'chart-1',
	type: 'line',
	title: 'TVL',
	description: 'Total value locked',
	axes: {
		x: { field: 'date', label: 'Date', type: 'time' },
		yAxes: [{ id: 'left', fields: ['value'], label: 'Value', position: 'left' }]
	},
	series: [
		{
			name: 'TVL',
			type: 'line',
			yAxisId: 'left',
			metricClass: 'stock',
			dataMapping: { xField: 'date', yField: 'value' },
			styling: {}
		}
	],
	dataTransformation: { timeField: 'date', metrics: ['value'] }
}

describe('chart payload normalization', () => {
	it('keeps array-backed chart data keyed by chart id', () => {
		const data = normalizeChartDataByKey({
			'chart-1': [{ date: 1, value: 10 }],
			ignored: { date: 2, value: 20 }
		})

		expect(data).toEqual({ 'chart-1': [{ date: 1, value: 10 }] })
	})

	it('normalizes dashboard items and bundled chart data from unknown payloads', () => {
		const items = [{ kind: 'llamaai-chart', chartRef: 'chart-1', title: 'TVL' }]
		expect(normalizeDashboardItems(items)).toBe(items)
		expect(normalizeDashboardItems({})).toEqual([])

		expect(
			normalizeDashboardChartData({
				'chart-1': { config: chartConfig, data: [{ date: 1, value: 10 }], toolChain: [{ name: 'generate_chart' }] },
				ignored: { config: chartConfig, data: null },
				missingConfig: { data: [{ date: 2, value: 20 }] },
				malformedConfig: { config: { id: 'chart-2', type: 'line' }, data: [{ date: 3, value: 30 }] }
			})
		).toEqual({
			'chart-1': { config: chartConfig, data: [{ date: 1, value: 10 }], toolChain: [{ name: 'generate_chart' }] },
			malformedConfig: { config: { id: 'chart-2', type: 'line' }, data: [{ date: 3, value: 30 }], toolChain: [] }
		})
	})

	it('drops dashboard chart data when no object configs remain', () => {
		expect(
			normalizeDashboardChartData({
				missingConfig: { data: [{ date: 1, value: 10 }] },
				nonObjectConfig: { config: null, data: [{ date: 2, value: 20 }] }
			})
		).toBeUndefined()
	})
})
