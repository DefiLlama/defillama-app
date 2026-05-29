import { describe, expect, it } from 'vitest'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import { filterLlamaAIChartPayload } from '../utils/llamaAIChartTimeFilter'

const baseConfig: ChartConfiguration = {
	id: 'chart-1',
	type: 'line',
	title: 'TVL',
	description: '',
	axes: {
		x: { field: 'date', label: 'Date', type: 'time' },
		yAxes: [{ id: 'y1', fields: ['tvl'], label: 'TVL', position: 'left' }]
	},
	series: [
		{
			name: 'TVL',
			type: 'line',
			yAxisId: 'y1',
			metricClass: 'stock',
			dataMapping: { xField: 'date', yField: 'tvl' },
			styling: {}
		}
	],
	dataTransformation: {
		timeField: 'date',
		metrics: ['tvl']
	}
}

describe('filterLlamaAIChartPayload', () => {
	const rows = [
		{ date: '2020-01-01', tvl: 1 },
		{ date: '2024-06-01', tvl: 2 },
		{ date: '2025-01-01', tvl: 3 }
	]

	it('returns all rows when time period is all', () => {
		expect(filterLlamaAIChartPayload([baseConfig], rows, 'all')).toEqual(rows)
	})

	it('filters time-series rows by preset period', () => {
		const filtered = filterLlamaAIChartPayload([baseConfig], rows, 'custom', {
			type: 'absolute',
			startDate: 1577836800,
			endDate: 1717209600
		}) as typeof rows
		expect(filtered.map((row) => row.date)).toEqual(['2020-01-01', '2024-06-01'])
	})

	it('filters record chart data by dataset key', () => {
		const filtered = filterLlamaAIChartPayload([baseConfig], { 'chart-1': rows }, 'custom', {
			type: 'absolute',
			startDate: 1577836800,
			endDate: 1717209600
		}) as Record<string, typeof rows>
		expect(filtered['chart-1'].map((row) => row.date)).toEqual(['2020-01-01', '2024-06-01'])
	})

	it('leaves non-time charts unchanged', () => {
		const pieConfig: ChartConfiguration = {
			...baseConfig,
			type: 'pie',
			axes: {
				x: { field: 'name', label: 'Name', type: 'category' },
				yAxes: [{ id: 'y1', fields: ['value'], label: 'Value', position: 'left' }]
			}
		}
		const pieRows = [
			{ name: 'A', value: 1 },
			{ name: 'B', value: 2 }
		]
		expect(filterLlamaAIChartPayload([pieConfig], pieRows, '30d')).toEqual(pieRows)
	})
})
