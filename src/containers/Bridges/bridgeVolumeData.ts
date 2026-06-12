import type { ChartTimeGrouping } from '~/components/ECharts/types'
import { getBucketTimestampSec } from '~/components/ECharts/utils'
import type { RawBridgeVolumePoint } from './api.types'

export const BRIDGE_VOLUME_VIEW_TYPES = ['Split', 'Combined'] as const
export type BridgeVolumeViewType = (typeof BRIDGE_VOLUME_VIEW_TYPES)[number]

export const BRIDGE_VOLUME_METRIC_TYPES = ['Volume', 'Transactions'] as const
export type BridgeVolumeMetricType = (typeof BRIDGE_VOLUME_METRIC_TYPES)[number]

export type BridgeVolumeInputPoint = RawBridgeVolumePoint

export const BRIDGE_VOLUME_SPLIT_CHARTS = [
	{
		type: 'bar' as const,
		name: 'Deposits',
		encode: { x: 'timestamp', y: 'Deposits' },
		color: '#3b82f6',
		stack: 'metric',
		large: false
	},
	{
		type: 'bar' as const,
		name: 'Withdrawals',
		encode: { x: 'timestamp', y: 'Withdrawals' },
		color: '#ef4444',
		stack: 'metric',
		large: false
	}
]

export const BRIDGE_VOLUME_COMBINED_CHARTS = [
	{ type: 'bar' as const, name: 'Total', encode: { x: 'timestamp', y: 'Total' }, color: '#22c55e' }
]

function getBridgeMetricValues(item: BridgeVolumeInputPoint, metricType: BridgeVolumeMetricType) {
	// Raw bridge volume rows can omit one side of a metric; missing side contributes zero to the bucket.
	return {
		deposits: metricType === 'Volume' ? (item.depositUSD ?? 0) : (item.depositTxs ?? 0),
		withdrawals: metricType === 'Volume' ? (item.withdrawUSD ?? 0) : (item.withdrawTxs ?? 0)
	}
}

function pushBridgeVolumeDatasetRow({
	source,
	timestamp,
	deposits,
	withdrawals,
	viewType
}: {
	source: Array<Record<string, number>>
	timestamp: number
	deposits: number
	withdrawals: number
	viewType: BridgeVolumeViewType
}) {
	source.push(
		viewType === 'Split'
			? {
					timestamp,
					Deposits: deposits,
					Withdrawals: -1 * withdrawals
				}
			: {
					timestamp,
					Total: deposits + withdrawals
				}
	)
}

export function buildBridgeVolumeChartData({
	data,
	timePeriod,
	metricType,
	viewType
}: {
	data: BridgeVolumeInputPoint[] | null | undefined
	timePeriod: ChartTimeGrouping
	metricType: BridgeVolumeMetricType
	viewType: BridgeVolumeViewType
}) {
	const isSplit = viewType === 'Split'
	const dimensions = isSplit ? ['timestamp', 'Deposits', 'Withdrawals'] : ['timestamp', 'Total']
	const source: Array<Record<string, number>> = []

	if (!data?.length) {
		return {
			metricType,
			dataset: { source, dimensions },
			charts: isSplit ? BRIDGE_VOLUME_SPLIT_CHARTS : BRIDGE_VOLUME_COMBINED_CHARTS
		}
	}

	if (timePeriod === 'daily') {
		// Bridge volume API returns unix seconds as strings; chart rows use milliseconds.
		const sortedData = data.toSorted((a, b) => Number(a.date) - Number(b.date))
		for (const item of sortedData) {
			const { deposits, withdrawals } = getBridgeMetricValues(item, metricType)
			pushBridgeVolumeDatasetRow({
				source,
				timestamp: Number(item.date) * 1e3,
				deposits,
				withdrawals,
				viewType
			})
		}

		return {
			metricType,
			dataset: { source, dimensions },
			charts: isSplit ? BRIDGE_VOLUME_SPLIT_CHARTS : BRIDGE_VOLUME_COMBINED_CHARTS
		}
	}

	const groupedData = new Map<
		number,
		{
			deposits: number
			withdrawals: number
		}
	>()

	// Bridge volume API returns unix seconds as strings.
	for (const item of data) {
		const key = getBucketTimestampSec(Number(item.date), timePeriod)
		const { deposits, withdrawals } = getBridgeMetricValues(item, metricType)
		const existing = groupedData.get(key)
		if (existing) {
			existing.deposits += deposits
			existing.withdrawals += withdrawals
		} else {
			groupedData.set(key, { deposits, withdrawals })
		}
	}

	const groupedRows = Array.from(groupedData.entries()).sort((a, b) => a[0] - b[0])
	for (const [date, values] of groupedRows) {
		pushBridgeVolumeDatasetRow({
			source,
			timestamp: date * 1e3,
			deposits: values.deposits,
			withdrawals: values.withdrawals,
			viewType
		})
	}

	return {
		metricType,
		dataset: { source, dimensions },
		charts: isSplit ? BRIDGE_VOLUME_SPLIT_CHARTS : BRIDGE_VOLUME_COMBINED_CHARTS
	}
}
