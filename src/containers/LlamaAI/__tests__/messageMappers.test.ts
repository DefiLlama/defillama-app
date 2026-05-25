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

	it('maps shared flat chart data to the first chart dataset key', () => {
		const message: SharedSessionMessage = {
			role: 'assistant',
			content: 'Chart',
			messageId: 'shared-message',
			timestamp: 1,
			charts: [{ ...chart, datasetName: 'tvl_dataset' }],
			chartData: [{ timestamp: 1, tvl: 100 }]
		}

		const mapped = mapSharedSessionMessage(message)

		expect(mapped.charts?.[0]?.chartData).toEqual({
			tvl_dataset: [{ timestamp: 1, tvl: 100 }]
		})
	})

	it('keeps empty persisted lists empty', () => {
		expect(mapPersistedMessages(undefined)).toEqual([])
	})
})
