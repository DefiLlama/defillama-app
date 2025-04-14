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
}

interface UpcomingUnlockVolumeChartProps {
	protocols: ProtocolUnlockData[]
	height?: string
}

const TIME_PERIODS = ['Weekly', 'Monthly'] as const
type TimePeriod = typeof TIME_PERIODS[number]

export function UpcomingUnlockVolumeChart({ protocols, height }: UpcomingUnlockVolumeChartProps) {
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('Monthly')

	const chartData = useMemo(() => {
		if (!protocols || protocols.length === 0) return []

		const upcomingUnlocks: Array<{ timestamp: number; valueUSD: number }> = []

		protocols.forEach((protocol) => {
			if (!protocol.upcomingEvent || protocol.tPrice === null || protocol.tPrice === undefined) {
				return
			}

			protocol.upcomingEvent.forEach((event) => {
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
	}, [protocols, timePeriod])

	return (
		<>
			<div className="text-xs font-medium m-3 ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]">
				{TIME_PERIODS.map((period) => (
					<button
						key={period}
						onClick={() => setTimePeriod(period)}
						data-active={timePeriod === period}
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
					>
						{period}
					</button>
				))}
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
				<p className="flex items-center justify-center text-[var(--text3)]" style={{ height: height ?? '360px' }}>
					No upcoming unlock data available for the selected period.
				</p>
			)}
		</>
	)
}
