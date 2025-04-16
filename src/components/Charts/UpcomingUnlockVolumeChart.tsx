import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import type { IBarChartProps } from '~/components/ECharts/types'

dayjs.extend(weekOfYear)

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface ProtocolUnlockData {
	name: string
	tPrice: number | null
	upcomingEvent: Array<{
		timestamp: number | null
		noOfTokens: number[]
	}>
	events: Array<{
		timestamp: number | null
		noOfTokens: number[]
	}>
}

interface UpcomingUnlockVolumeChartProps {
	protocols: ProtocolUnlockData[]
	height?: string
}

const TIME_PERIODS = ['Weekly', 'Monthly'] as const
type TimePeriod = typeof TIME_PERIODS[number]

export default function UpcomingUnlockVolumeChart({ protocols, height = '300px' }: UpcomingUnlockVolumeChartProps) {
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('Monthly')
	const [isFullView, setIsFullView] = useState(false)

	const chartData = useMemo(() => {
		if (!protocols || protocols.length === 0) return []

		const upcomingUnlocks: Array<{ timestamp: number; valueUSD: number }> = []
		const endTimestamp = dayjs('2031-01-01').unix()

		protocols.forEach((protocol) => {
			if (!protocol.events || protocol.tPrice === null || protocol.tPrice === undefined) {
				return
			}

			const futureEvents = protocol.events.filter((event) => {
				const now = Date.now() / 1000
				return event.timestamp >= now && (isFullView || event.timestamp < endTimestamp)
			})

			futureEvents.forEach((event) => {
				if (event.timestamp === null || !event.noOfTokens || event.noOfTokens.length === 0) {
					return
				}

				const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + amount, 0)
				if (totalTokens === 0) {
					return
				}

				const valueUSD = totalTokens * protocol.tPrice
				upcomingUnlocks.push({ timestamp: event.timestamp, valueUSD })
			})
		})

		const groupedData = new Map<number, number>()

		upcomingUnlocks.forEach((unlock) => {
			const date = dayjs.unix(unlock.timestamp)
			if (!date.isValid()) {
				return
			}
			const key = (timePeriod === 'Weekly' ? date.startOf('week') : date.startOf('month')).unix()

			const existingValue = groupedData.get(key) || 0
			groupedData.set(key, existingValue + unlock.valueUSD)
		})

		return Array.from(groupedData.entries())
			.map(([date, totalUpcomingUnlockValueUSD]) => ({
				date,
				'Upcoming Unlock Value': totalUpcomingUnlockValueUSD
			}))
			.sort((a, b) => a.date - b.date)
	}, [protocols, timePeriod, isFullView])

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-4">
				<div className="flex-1 min-w-[150px] max-w-[200px]">
					<div className="bg-[var(--bg7)] rounded-lg p-1 flex gap-1">
						{TIME_PERIODS.map((period) => (
							<button
								key={period}
								onClick={() => setTimePeriod(period)}
								className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
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
				<button
					onClick={() => setIsFullView(!isFullView)}
					className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
						isFullView
							? 'bg-blue-500 text-white shadow-sm'
							: 'bg-[var(--bg7)] text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
					}`}
				>
					{isFullView ? 'Show Until 2030' : 'Show Full History'}
				</button>
			</div>

			{chartData.length > 0 ? (
				<BarChart
					chartData={chartData}
					title=""
					height={height}
					hideDefaultLegend={false}
					customLegendOptions={['Upcoming Unlock Value']}
					stacks={{
						'Upcoming Unlock Value': 'value'
					}}
					stackColors={{
						'Upcoming Unlock Value': '#8884d8'
					}}
					chartOptions={{
						xAxis: {
							type: 'time'
						},
						yAxis: {}
					}}
				/>
			) : (
				<div className="flex items-center justify-center text-[var(--text3)]" style={{ height }}>
					No upcoming unlock data available for the selected period.
				</div>
			)}
		</>
	)
}
