import { lazy, Suspense, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import type { IBarChartProps } from '~/components/ECharts/types'
import { TagGroup } from '../TagGroup'

dayjs.extend(weekOfYear)

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

interface ProtocolUnlockData {
	name: string
	tSymbol?: string
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
type TimePeriod = (typeof TIME_PERIODS)[number]

const VIEW_MODES = ['Total View', 'Breakdown View'] as const
type ViewMode = (typeof VIEW_MODES)[number]

export function UpcomingUnlockVolumeChart({ protocols, height }: UpcomingUnlockVolumeChartProps) {
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('Weekly')
	const [isFullView, setIsFullView] = useState(false)
	const [viewMode, setViewMode] = useState<ViewMode>('Total View')

	const { chartData, chartStacks, chartStackColors, chartLegendOptions } = useMemo(() => {
		if (!protocols || protocols.length === 0) {
			return { chartData: [], chartStacks: {}, chartStackColors: {}, chartLegendOptions: [] }
		}

		const upcomingUnlocks: Array<{ timestamp: number; valueUSD: number; protocolName: string }> = []
		const endTimestamp = dayjs('2031-01-01').unix()
		const now = Date.now() / 1000

		protocols.forEach((protocol) => {
			if (!protocol.events || protocol.tPrice === null || protocol.tPrice === undefined || protocol.tPrice <= 0) {
				return
			}

			const futureEvents = protocol.events.filter((event) => {
				return event.timestamp !== null && event.timestamp >= now && (isFullView || event.timestamp < endTimestamp)
			})

			futureEvents.forEach((event) => {
				if (event.timestamp === null || !event.noOfTokens || event.noOfTokens.length === 0) {
					return
				}

				const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + (amount || 0), 0)
				if (totalTokens === 0) {
					return
				}

				const valueUSD = totalTokens * protocol.tPrice
				if (valueUSD > 0) {
					upcomingUnlocks.push({ timestamp: event.timestamp, valueUSD, protocolName: protocol.name })
				}
			})
		})

		let processedChartData: Array<Record<string, number | string>> = []
		let finalStacks = {}
		let finalStackColors = {}
		let finalLegendOptions: string[] = []

		if (viewMode === 'Total View') {
			const groupedData = new Map<number, number>()

			upcomingUnlocks.forEach((unlock) => {
				const date = dayjs.unix(unlock.timestamp)
				if (!date.isValid()) return
				const key = (timePeriod === 'Weekly' ? date.startOf('week') : date.startOf('month')).unix()
				const existingValue = groupedData.get(key) || 0
				groupedData.set(key, existingValue + unlock.valueUSD)
			})

			processedChartData = Array.from(groupedData.entries())
				.map(([date, totalUpcomingUnlockValueUSD]) => ({
					date,
					'Total Upcoming Unlock Value': totalUpcomingUnlockValueUSD
				}))
				.sort((a, b) => a.date - b.date)

			finalLegendOptions = ['Total Upcoming Unlock Value']
			finalStacks = { 'Total Upcoming Unlock Value': 'value' }
			finalStackColors = { 'Total Upcoming Unlock Value': '#8884d8' }
		} else {
			const groupedData = new Map<number, Record<string, number>>()
			const allProtocolNames = new Set<string>()

			upcomingUnlocks.forEach((unlock) => {
				const date = dayjs.unix(unlock.timestamp)
				if (!date.isValid()) return
				const key = (timePeriod === 'Weekly' ? date.startOf('week') : date.startOf('month')).unix()

				const existingRecord = groupedData.get(key) || {}
				const currentProtocolValue = existingRecord[unlock.protocolName] || 0
				existingRecord[unlock.protocolName] = currentProtocolValue + unlock.valueUSD

				groupedData.set(key, existingRecord)
				allProtocolNames.add(unlock.protocolName)
			})

			processedChartData = Array.from(groupedData.entries())
				.map(([date, protocolValues]) => ({
					date,
					...protocolValues
				}))
				.sort((a, b) => (a.date as number) - (b.date as number))

			finalLegendOptions = Array.from(allProtocolNames).sort()
			finalStacks = finalLegendOptions.reduce((acc, name) => {
				acc[name] = 'value'
				return acc
			}, {})

			finalStackColors = {}
		}

		return {
			chartData: processedChartData,
			chartStacks: finalStacks,
			chartStackColors: finalStackColors,
			chartLegendOptions: finalLegendOptions
		}
	}, [protocols, timePeriod, isFullView, viewMode])

	return (
		<>
			{chartData.length > 0 ? (
				<Suspense fallback={<></>}>
					<BarChart
						chartData={chartData}
						title="Upcoming Unlocks"
						height={height}
						hideDefaultLegend={true}
						customLegendOptions={viewMode === 'Total View' ? chartLegendOptions : []}
						stacks={chartStacks}
						stackColors={chartStackColors}
						chartOptions={chartOptions}
						customComponents={
							<TagGroup
								selectedValue={viewMode}
								setValue={(value: (typeof VIEW_MODES)[number]) => setViewMode(value)}
								values={VIEW_MODES as unknown as string[]}
								className="ml-auto"
							/>
						}
					/>
				</Suspense>
			) : (
				<p className="flex items-center justify-center" style={{ height: height ?? '360px' }}>
					No upcoming unlock data available for the selected period.
				</p>
			)}
		</>
	)
}

const chartOptions = {
	tooltip: {
		trigger: 'axis'
	},
	xAxis: {
		type: 'time'
	},
	yAxis: {
		type: 'value'
	},
	grid: {
		left: '3%',
		right: '4%',
		outerBoundsMode: 'same',
		outerBoundsContain: 'axisLabel'
	}
}
