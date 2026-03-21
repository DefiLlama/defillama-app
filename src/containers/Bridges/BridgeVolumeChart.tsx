import dayjs from 'dayjs'
import { lazy, type ReactNode, startTransition, Suspense, useDeferredValue, useMemo, useState } from 'react'
import {
	ChartGroupingSelector,
	DWM_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { TagGroup } from '~/components/TagGroup'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

interface BridgeVolumeChartProps {
	data: any[]
	height?: string
	onReady?: (instance: any | null) => void
	headerStart?: ReactNode
	headerEnd?: ReactNode
}

const VIEW_TYPES = ['Split', 'Combined'] as const
type ViewType = (typeof VIEW_TYPES)[number]
const METRIC_TYPES = ['Volume', 'Transactions'] as const
type MetricType = (typeof METRIC_TYPES)[number]

const SPLIT_CHARTS = [
	{
		type: 'bar' as const,
		name: 'Deposits',
		encode: { x: 'timestamp', y: 'Deposits' },
		color: '#3b82f6',
		stack: 'metric'
	},
	{
		type: 'bar' as const,
		name: 'Withdrawals',
		encode: { x: 'timestamp', y: 'Withdrawals' },
		color: '#ef4444',
		stack: 'metric'
	}
]
const COMBINED_CHARTS = [
	{ type: 'bar' as const, name: 'Total', encode: { x: 'timestamp', y: 'Total' }, color: '#22c55e' }
]

export function BridgeVolumeChart({ data, height, onReady, headerStart, headerEnd }: BridgeVolumeChartProps) {
	const [timePeriod, setTimePeriod] = useState<LowercaseDwmGrouping>('weekly')
	const [metricType, setMetricType] = useState<MetricType>('Volume')
	const [viewType, setViewType] = useState<ViewType>('Split')

	const chartData = useMemo(() => {
		if (!data?.length) return []

		const sortedData = [...data].sort((a, b) => Number(a.date) - Number(b.date))

		const rawData = sortedData.map((item) => ({
			timestamp: Number(item.date),
			deposits: metricType === 'Volume' ? item.depositUSD || 0 : item.depositTxs || 0,
			withdrawals: metricType === 'Volume' ? item.withdrawUSD || 0 : item.withdrawTxs || 0
		}))

		if (timePeriod === 'daily') {
			return rawData.map((item) => ({
				date: item.timestamp,
				...(viewType === 'Split'
					? {
							Deposits: item.deposits,
							Withdrawals: -1 * item.withdrawals
						}
					: {
							Total: item.deposits + item.withdrawals
						})
			}))
		}

		const groupedData = new Map<
			number,
			{
				deposits: number
				withdrawals: number
			}
		>()

		for (const item of rawData) {
			const date = dayjs.unix(item.timestamp)
			const key = (timePeriod === 'weekly' ? date.startOf('week') : date.startOf('month')).unix()

			const existing = groupedData.get(key) || { deposits: 0, withdrawals: 0 }
			groupedData.set(key, {
				deposits: existing.deposits + item.deposits,
				withdrawals: existing.withdrawals + item.withdrawals
			})
		}

		return Array.from(groupedData.entries())
			.map(([date, values]) => ({
				date,
				...(viewType === 'Split'
					? {
							Deposits: values.deposits,
							Withdrawals: -1 * values.withdrawals
						}
					: {
							Total: values.deposits + values.withdrawals
						})
			}))
			.sort((a, b) => a.date - b.date)
	}, [data, timePeriod, metricType, viewType])

	const volumeChartData = useMemo(() => {
		const isSplit = viewType === 'Split'
		const dims = isSplit ? ['timestamp', 'Deposits', 'Withdrawals'] : ['timestamp', 'Total']
		return {
			metricType,
			dataset: {
				source: chartData.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: dims
			},
			charts: isSplit ? SPLIT_CHARTS : COMBINED_CHARTS
		}
	}, [chartData, metricType, viewType])
	const deferredChartData = useDeferredValue(volumeChartData)

	return (
		<>
			<div className="flex flex-wrap items-center justify-end gap-2 p-2">
				{headerStart}
				<ChartGroupingSelector
					value={timePeriod}
					setValue={setTimePeriod}
					options={DWM_GROUPING_OPTIONS_LOWERCASE}
					className={headerStart ? undefined : 'mr-auto'}
				/>
				<TagGroup
					selectedValue={viewType}
					setValue={(newViewType) => startTransition(() => setViewType(newViewType))}
					values={VIEW_TYPES}
				/>
				<TagGroup
					selectedValue={metricType}
					setValue={(newMetricType) => startTransition(() => setMetricType(newMetricType))}
					values={METRIC_TYPES}
				/>
				{headerEnd}
			</div>

			<Suspense fallback={<div style={{ height: height ?? '360px' }} />}>
				{/* TODO: Add a subtle stale-state indicator if we revisit deferred transitions UX. */}
				<MultiSeriesChart2
					dataset={deferredChartData.dataset}
					charts={deferredChartData.charts}
					height={height}
					hideDefaultLegend={false}
					valueSymbol={deferredChartData.metricType === 'Volume' ? '$' : ''}
					onReady={onReady}
				/>
			</Suspense>
		</>
	)
}
