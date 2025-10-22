import { lazy, Suspense, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { IBarChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { TagGroup } from '~/components/TagGroup'
import { useFetchBridgeVolume } from '~/containers/Bridges/queries.client'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

interface BridgeVolumeChartProps {
	chain?: string
	height?: string
}

const TIME_PERIODS = ['Daily', 'Weekly', 'Monthly'] as const
type TimePeriod = (typeof TIME_PERIODS)[number]
const VIEW_TYPES = ['Split', 'Combined'] as const
type ViewType = (typeof VIEW_TYPES)[number]
const METRIC_TYPES = ['Volume', 'Transactions'] as const
type MetricType = (typeof METRIC_TYPES)[number]

export function BridgeVolumeChart({ chain = 'all', height }: BridgeVolumeChartProps) {
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('Weekly')
	const [metricType, setMetricType] = useState<MetricType>('Volume')
	const [viewType, setViewType] = useState<ViewType>('Split')
	const { data, isLoading, error } = useFetchBridgeVolume(chain)

	const chartData = useMemo(() => {
		if (!data) return []

		const sortedData = [...data].sort((a, b) => Number(a.date) - Number(b.date))

		const rawData = sortedData.map((item) => ({
			timestamp: Number(item.date),
			deposits: metricType === 'Volume' ? item.depositUSD || 0 : item.depositTxs || 0,
			withdrawals: metricType === 'Volume' ? item.withdrawUSD || 0 : item.withdrawTxs || 0
		}))

		if (timePeriod === 'Daily') {
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

		rawData.forEach((item) => {
			const date = dayjs.unix(item.timestamp)
			const key = (timePeriod === 'Weekly' ? date.startOf('week') : date.startOf('month')).unix()

			const existing = groupedData.get(key) || { deposits: 0, withdrawals: 0 }
			groupedData.set(key, {
				deposits: existing.deposits + item.deposits,
				withdrawals: existing.withdrawals + item.withdrawals
			})
		})

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

	if (isLoading)
		return (
			<div className="flex items-center justify-center" style={{ height: `calc(${height ?? '360px'} + 82px)` }}>
				<LocalLoader />
			</div>
		)

	if (error)
		return (
			<div className="flex items-center justify-center" style={{ height: `calc(${height ?? '360px'} + 82px)` }}>
				<p>Error loading bridge volume data</p>
			</div>
		)

	return (
		<>
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-2 overflow-x-auto p-3 sm:flex-row sm:flex-wrap sm:justify-center md:gap-4">
				<div className="flex flex-1 flex-col gap-1">
					<h2 className="text-xs font-medium text-(--text-secondary)">Time Period:</h2>
					<TagGroup
						selectedValue={timePeriod}
						setValue={(period) => setTimePeriod(period as TimePeriod)}
						values={TIME_PERIODS}
						className="w-full *:flex-1"
					/>
				</div>

				<div className="flex flex-1 flex-col gap-1">
					<h2 className="text-xs font-medium text-(--text-secondary)">View:</h2>
					<TagGroup
						selectedValue={viewType}
						setValue={(viewType) => setViewType(viewType as ViewType)}
						values={VIEW_TYPES}
						className="w-full *:flex-1"
					/>
				</div>

				<div className="flex flex-1 flex-col gap-1">
					<h2 className="text-xs font-medium text-(--text-secondary)">Metric:</h2>
					<TagGroup
						selectedValue={metricType}
						setValue={(metricType) => setMetricType(metricType as MetricType)}
						values={METRIC_TYPES}
						className="w-full *:flex-1"
					/>
				</div>
			</div>

			<Suspense fallback={<div style={{ height: height ?? '360px' }} />}>
				<BarChart
					chartData={chartData}
					title=""
					height={height}
					hideDefaultLegend={false}
					customLegendOptions={viewType === 'Split' ? ['Deposits', 'Withdrawals'] : ['Total']}
					stacks={
						viewType === 'Split'
							? {
									Deposits: 'metric',
									Withdrawals: 'metric'
								}
							: undefined
					}
					stackColors={
						viewType === 'Split'
							? {
									Deposits: '#3b82f6',
									Withdrawals: '#ef4444'
								}
							: {
									Total: '#22c55e'
								}
					}
					chartOptions={{
						overrides: {
							inflow: viewType === 'Split'
						}
					}}
				/>
			</Suspense>
		</>
	)
}
