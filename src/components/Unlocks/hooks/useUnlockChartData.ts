import * as React from 'react'
import type { Dayjs } from 'dayjs'
import { COLOR_PALETTE } from '../constants'
import type { DailyUnlocks, PrecomputedData } from '../types'

interface UseUnlockChartDataProps {
	currentDate: Dayjs
	viewMode: 'Month' | 'Week' | 'List' | 'TreeMap'
	unlocksData: {
		[date: string]: DailyUnlocks
	}
	precomputedData?: PrecomputedData
}

export const useUnlockChartData = ({
	currentDate,
	viewMode,
	unlocksData,
	precomputedData
}: UseUnlockChartDataProps) => {
	const weekRange = React.useMemo(() => {
		if (viewMode !== 'Week') return null
		const startOfWeek = currentDate.startOf('week')
		return {
			start: startOfWeek,
			dates: Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day').format('YYYY-MM-DD'))
		}
	}, [currentDate, viewMode])

	const monthRange = React.useMemo(() => {
		if (viewMode !== 'Month') return null
		const startOfMonth = currentDate.startOf('month')
		const endOfMonth = currentDate.endOf('month')
		const daysInMonth = endOfMonth.date()
		return {
			start: startOfMonth,
			end: endOfMonth,
			daysInMonth,
			dates: Array.from({ length: daysInMonth }, (_, i) => startOfMonth.date(i + 1).format('YYYY-MM-DD'))
		}
	}, [currentDate, viewMode])

	const weeklyChartData = React.useMemo(() => {
		if (viewMode !== 'Week' || !weekRange) return null

		const weekData: Array<any> = []
		const protocolTotals: { [key: string]: number } = {}
		const protocolColorMap: { [key: string]: string } = {}

		weekRange.dates.forEach((dateStr) => {
			const dayData = unlocksData?.[dateStr]
			if (dayData?.events) {
				dayData.events.forEach((event) => {
					if (!protocolTotals[event.protocol]) {
						protocolTotals[event.protocol] = 0
					}
					protocolTotals[event.protocol] += event.value
				})
			}
		})

		const sortedProtocols = Object.keys(protocolTotals).sort((a, b) => protocolTotals[b] - protocolTotals[a])

		sortedProtocols.forEach((protocol, index) => {
			protocolColorMap[protocol] = COLOR_PALETTE[index % COLOR_PALETTE.length]
		})

		weekRange.dates.forEach((dateStr, i) => {
			const day = weekRange.start.add(i, 'day')
			const dayData = unlocksData?.[dateStr]
			const dataPoint: { date: number; [key: string]: number } = { date: day.unix() }

			sortedProtocols.forEach((protocol) => {
				dataPoint[protocol] = 0
			})

			if (dayData?.events) {
				dayData.events.forEach((event) => {
					if (dataPoint.hasOwnProperty(event.protocol)) {
						dataPoint[event.protocol] = event.value
					}
				})
			}
			weekData.push(dataPoint)
		})

		if (sortedProtocols.length === 0) {
			return {
				chartData: weekData.map((d) => [d.date, 0]),
				stacks: {},
				stackColors: {}
			}
		}

		const stacks = sortedProtocols.reduce((acc, protocol) => {
			acc[protocol] = 'unlocks'
			return acc
		}, {})

		return {
			chartData: weekData,
			stacks,
			stackColors: protocolColorMap
		}
	}, [weekRange, unlocksData])

	const monthlyChartData = React.useMemo(() => {
		if (viewMode !== 'Month' || !monthRange) return null

		const monthData: Array<any> = []
		const protocolTotals: { [key: string]: number } = {}
		const protocolColorMap: { [key: string]: string } = {}

		monthRange.dates.forEach((dateStr) => {
			const dayData = unlocksData?.[dateStr]
			if (dayData?.events) {
				dayData.events.forEach((event) => {
					if (!protocolTotals[event.protocol]) {
						protocolTotals[event.protocol] = 0
					}
					protocolTotals[event.protocol] += event.value
				})
			}
		})

		const sortedProtocols = Object.keys(protocolTotals).sort((a, b) => protocolTotals[b] - protocolTotals[a])

		sortedProtocols.forEach((protocol, index) => {
			protocolColorMap[protocol] = COLOR_PALETTE[index % COLOR_PALETTE.length]
		})

		monthRange.dates.forEach((dateStr, i) => {
			const day = monthRange.start.date(i + 1)
			const dayData = unlocksData[dateStr]
			const dataPoint: { date: number; [key: string]: number } = { date: day.unix() }

			sortedProtocols.forEach((protocol) => {
				dataPoint[protocol] = 0
			})

			if (dayData?.events) {
				dayData.events.forEach((event) => {
					if (dataPoint.hasOwnProperty(event.protocol)) {
						dataPoint[event.protocol] = event.value
					}
				})
			}
			monthData.push(dataPoint)
		})

		if (sortedProtocols.length === 0) {
			return {
				chartData: monthData.map((d) => [d.date, 0]),
				stacks: {},
				stackColors: {}
			}
		}

		const stacks = sortedProtocols.reduce((acc, protocol) => {
			acc[protocol] = 'unlocks'
			return acc
		}, {})

		return {
			chartData: monthData,
			stacks,
			stackColors: protocolColorMap
		}
	}, [monthRange, unlocksData])

	return {
		weeklyChartData,
		monthlyChartData
	}
}
