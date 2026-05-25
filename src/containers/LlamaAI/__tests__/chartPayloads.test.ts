import { describe, expect, it } from 'vitest'
import {
	normalizeChartDataByKey,
	normalizeDashboardChartData,
	normalizeDashboardItems
} from '~/containers/LlamaAI/chartPayloads'
import type { ChartConfiguration, ChartDataByKey, DashboardChartData, DashboardItem } from '~/containers/LlamaAI/types'

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
	it('passes typed chart data through without filtering entries', () => {
		const data: ChartDataByKey = {
			'chart-1': [{ date: 1, value: 10 }],
			'chart-2': [{ date: 2, value: 20 }]
		}

		expect(normalizeChartDataByKey(data)).toBe(data)
	})

	it('passes dashboard items and bundled chart data through without filtering entries', () => {
		const items: DashboardItem[] = [{ id: 'item-1', kind: 'llamaai-chart', chartRef: 'chart-1', title: 'TVL' }]
		const chartData: DashboardChartData = {
			'chart-1': { config: chartConfig, data: [{ date: 1, value: 10 }], toolChain: [{ name: 'generate_chart' }] },
			'chart-2': { config: chartConfig, data: [{ date: 2, value: 20 }], toolChain: [] }
		}

		expect(normalizeDashboardItems(items)).toBe(items)
		expect(normalizeDashboardChartData(chartData)).toBe(chartData)
	})
})
