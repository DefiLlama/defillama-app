import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useFetchBridgeVolume } from '~/api/categories/bridges/client'
import type { IBarChartProps } from '~/components/ECharts/types'
import dayjs from 'dayjs'
import { LocalLoader } from '../LocalLoader'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface BridgeVolumeChartProps {
	chain?: string
	height?: string
}

const TIME_PERIODS = ['Daily', 'Weekly', 'Monthly'] as const
type TimePeriod = typeof TIME_PERIODS[number]
type MetricType = 'Volume' | 'Transactions'
type ViewType = 'Split' | 'Combined'

export default function BridgeVolumeChart({ chain = 'all', height = '360px' }: BridgeVolumeChartProps) {
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
			<div className="flex items-center justify-center" style={{ height }}>
				<LocalLoader />
			</div>
		)
	if (error) return <div>Error loading bridge volume data</div>
	return (
		<>
			<div className="flex items-center justify-between mb-4 gap-8">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-[var(--text2)]">Time Period:</span>
					<div className="bg-[var(--bg7)] rounded-lg p-1 flex gap-1">
						{TIME_PERIODS.map((period) => (
							<button
								key={period}
								onClick={() => setTimePeriod(period)}
								className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
									timePeriod === period
										? 'bg-blue-500 text-white shadow-sm'
										: 'text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
								}`}
							>
								{period}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-[var(--text2)]">View:</span>
					<div className="bg-[var(--bg7)] rounded-lg p-1 flex gap-1">
						<button
							onClick={() => setViewType('Split')}
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
								viewType === 'Split'
									? 'bg-blue-500 text-white shadow-sm'
									: 'text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
							}`}
						>
							Split
						</button>
						<button
							onClick={() => setViewType('Combined')}
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
								viewType === 'Combined'
									? 'bg-blue-500 text-white shadow-sm'
									: 'text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
							}`}
						>
							Combined
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-[var(--text2)]">Metric:</span>
					<div className="bg-[var(--bg7)] rounded-lg p-1 flex gap-1">
						<button
							onClick={() => setMetricType('Volume')}
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
								metricType === 'Volume'
									? 'bg-blue-500 text-white shadow-sm'
									: 'text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
							}`}
						>
							Volume
						</button>
						<button
							onClick={() => setMetricType('Transactions')}
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
								metricType === 'Transactions'
									? 'bg-blue-500 text-white shadow-sm'
									: 'text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
							}`}
						>
							Transactions Number
						</button>
					</div>
				</div>
			</div>

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
		</>
	)
}
