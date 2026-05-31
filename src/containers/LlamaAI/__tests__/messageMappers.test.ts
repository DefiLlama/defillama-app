import { describe, expect, it } from 'vitest'
import {
	mapPersistedMessage,
	mapPersistedMessages,
	mapSharedSessionMessage,
	type PersistedMessage,
	type SharedSessionMessage
} from '~/containers/LlamaAI/messageMappers'
import type { ChartConfiguration, DashboardItem } from '~/containers/LlamaAI/types'

const chart: ChartConfiguration = {
	id: 'chart-1',
	type: 'line',
	title: 'TVL',
	description: 'TVL over time',
	axes: {
		x: { field: 'timestamp', label: 'Date', type: 'time' },
		yAxes: [{ id: 'left', fields: ['tvl'], label: 'TVL', position: 'left' }]
	},
	series: [
		{
			name: 'TVL',
			type: 'line',
			yAxisId: 'left',
			metricClass: 'stock',
			dataMapping: { xField: 'timestamp', yField: 'tvl' },
			styling: {}
		}
	],
	dataTransformation: { timeField: 'timestamp', metrics: ['tvl'] },
	displayOptions: {
		canStack: false,
		canShowPercentage: false,
		canShowCumulative: false,
		supportsGrouping: false
	}
}

const dashboardItem = {
	id: 'dashboard-item-1',
	kind: 'llamaai-chart',
	chartRef: 'chart-1',
	title: 'TVL'
} satisfies DashboardItem

describe('messageMappers', () => {
	it('restores persisted dashboard chart data from message metadata', () => {
		const message: PersistedMessage = {
			role: 'assistant',
			content: 'Dashboard ready',
			messageId: 'message-1',
			charts: [chart],
			chartData: {
				'chart-1': [{ timestamp: 1, tvl: 100 }]
			},
			metadata: {
				dashboardConfig: {
					dashboardName: 'Protocol dashboard',
					items: [dashboardItem]
				}
			}
		}

		const mapped = mapPersistedMessage(message)

		expect(mapped.id).toBe('message-1')
		expect(mapped.dashboards?.[0]).toMatchObject({
			id: 'dashboard_restored_message-1',
			dashboardName: 'Protocol dashboard'
		})
		expect(mapped.dashboards?.[0]?.chartData?.['chart-1']).toMatchObject({
			config: chart,
			data: [{ timestamp: 1, tvl: 100 }],
			toolChain: []
		})
	})

	it('uses deterministic restored dashboard ids when message id is missing', () => {
		const message: PersistedMessage = {
			role: 'assistant',
			content: 'Dashboard ready',
			timestamp: 1,
			metadata: {
				dashboardConfig: {
					dashboardName: 'Protocol dashboard',
					items: [dashboardItem]
				}
			}
		}

		const first = mapPersistedMessage(message, 0)
		const second = mapPersistedMessage(message, 0)

		expect(first.dashboards?.[0]?.id).toBe(second.dashboards?.[0]?.id)
		expect(first.dashboards?.[0]?.id).toMatch(/^dashboard_restored_fallback_/)
	})

	it('maps shared flat chart data to the first chart dataset key', () => {
		const message: SharedSessionMessage = {
			role: 'assistant',
			content: 'Chart',
			messageId: 'shared-message',
			timestamp: 1,
			quotedText: 'quoted user message',
			charts: [{ ...chart, datasetName: 'tvl_dataset' }],
			chartData: [{ timestamp: 1, tvl: 100 }]
		}

		const mapped = mapSharedSessionMessage(message)

		expect(mapped.timestamp).toBe(1)
		expect(mapped.quotedText).toBe('quoted user message')
		expect(mapped.charts?.[0]?.chartData).toEqual({
			tvl_dataset: [{ timestamp: 1, tvl: 100 }]
		})
	})

	it('maps owned legacy flat chart data to the first chart dataset key', () => {
		const message: PersistedMessage = {
			role: 'assistant',
			content: 'Chart',
			charts: [{ ...chart, datasetName: 'tvl_dataset' }],
			chartData: [{ timestamp: '1772323200000', tvl: 100 }]
		}

		const mapped = mapPersistedMessage(message)

		expect(mapped.charts?.[0]?.chartData).toEqual({
			tvl_dataset: [{ timestamp: '1772323200000', tvl: 100 }]
		})
	})

	it('normalizes malformed restored dashboard items and missing chart refs', () => {
		const message: PersistedMessage = {
			role: 'assistant',
			content: 'Dashboard ready',
			charts: [chart],
			chartData: {
				'chart-1': [{ timestamp: 1, tvl: 100 }]
			},
			metadata: {
				dashboardConfig: {
					dashboardName: 'Protocol dashboard',
					items: [{ id: 'bad' }, { ...dashboardItem, chartRef: 'missing-chart' }, dashboardItem]
				}
			}
		}

		const mapped = mapPersistedMessage(message)

		expect(mapped.dashboards?.[0]?.items).toEqual([{ ...dashboardItem, chartRef: 'missing-chart' }, dashboardItem])
		expect(mapped.dashboards?.[0]?.chartData).toEqual({
			'chart-1': { config: chart, data: [{ timestamp: 1, tvl: 100 }], toolChain: [] }
		})
	})

	it('preserves legacy toolName-only executions from restored messages', () => {
		const mapped = mapPersistedMessage({
			role: 'assistant',
			content: 'Done',
			metadata: {
				toolExecutions: [{ toolName: 'search', success: true }]
			}
		})

		expect(mapped.toolExecutions?.[0]).toMatchObject({ name: 'search', toolName: 'search', success: true })
	})

	it('keeps empty persisted lists empty', () => {
		expect(mapPersistedMessages(undefined)).toEqual([])
	})

	it('preserves epoch timestamps and drops invalid persisted timestamps', () => {
		expect(
			mapPersistedMessage({
				role: 'assistant',
				content: 'Epoch',
				timestamp: 0
			}).timestamp
		).toBe(0)

		expect(
			mapPersistedMessage({
				role: 'assistant',
				content: 'Invalid',
				timestamp: 'not-a-date'
			}).timestamp
		).toBeUndefined()
	})
})
