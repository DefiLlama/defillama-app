import { describe, expect, it } from 'vitest'
import {
	normalizeChartConfigs,
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
	it('keeps valid chart configs and drops malformed entries', () => {
		expect(normalizeChartConfigs([chartConfig, { id: 'missing-shape' }, null])).toEqual([chartConfig])
		expect(normalizeChartConfigs({ charts: [chartConfig] })).toEqual([])
	})

	it('keeps keyed chart data arrays and drops malformed entries', () => {
		const data = {
			'chart-1': [{ date: 1, value: 10 }],
			'chart-2': [{ date: 2, value: 20 }],
			'chart-3': { date: 3, value: 30 }
		}

		expect(normalizeChartDataByKey(data)).toEqual({
			'chart-1': [{ date: 1, value: 10 }],
			'chart-2': [{ date: 2, value: 20 }]
		})
	})

	it('maps legacy flat chart data to the first chart dataset key', () => {
		expect(normalizeChartDataByKey([{ date: 1, value: 10 }], [{ ...chartConfig, datasetName: 'tvl_dataset' }])).toEqual(
			{
				tvl_dataset: [{ date: 1, value: 10 }]
			}
		)
	})

	it('normalizes dashboard items and bundled chart data defensively', () => {
		const items = [{ id: 'item-1', kind: 'llamaai-chart', chartRef: 'chart-1', title: 'TVL' }, { id: 'bad' }, null]
		const chartData = {
			'chart-1': { config: chartConfig, data: [{ date: 1, value: 10 }], toolChain: [{ name: 'generate_chart' }] },
			'chart-2': { config: chartConfig, data: [{ date: 2, value: 20 }], toolChain: 'legacy-bad-tool-chain' },
			'chart-3': { config: { id: 'bad-chart' }, data: [{ date: 3, value: 30 }], toolChain: [] },
			'chart-4': { config: chartConfig, data: { date: 4, value: 40 }, toolChain: [] }
		}

		expect(normalizeDashboardItems(items)).toEqual([
			{ id: 'item-1', kind: 'llamaai-chart', chartRef: 'chart-1', title: 'TVL' }
		])
		expect(normalizeDashboardChartData(chartData)).toEqual({
			'chart-1': { config: chartConfig, data: [{ date: 1, value: 10 }], toolChain: [{ name: 'generate_chart' }] },
			'chart-2': { config: chartConfig, data: [{ date: 2, value: 20 }], toolChain: [] }
		})
	})
})
