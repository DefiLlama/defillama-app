import * as React from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { COLOR_PALETTE } from '../constants'
import type { DailyUnlocks } from '../types'

interface UseUnlockChartDataProps {
	currentDate: Dayjs
	viewMode: 'month' | 'week' | 'list' | 'treemap'
	unlocksData: {
		[date: string]: DailyUnlocks
	}
}

export const useUnlockChartData = ({ currentDate, viewMode, unlocksData }: UseUnlockChartDataProps) => {
	const weeklyChartData = React.useMemo(() => {
		if (viewMode !== 'week') return null

		const startOfWeek = currentDate.startOf('week')
		const weekData: Array<any> = []
		const protocolTotals: { [key: string]: number } = {}
		const protocolColorMap: { [key: string]: string } = {}

		for (let i = 0; i < 7; i++) {
			const day = startOfWeek.add(i, 'day')
			const dateStr = day.format('YYYY-MM-DD')
			const dayData = unlocksData?.[dateStr]
			if (dayData?.events) {
				dayData.events.forEach((event) => {
					if (!protocolTotals[event.protocol]) {
						protocolTotals[event.protocol] = 0
					}
					protocolTotals[event.protocol] += event.value
				})
			}
		}

		const sortedProtocols = Object.keys(protocolTotals).sort((a, b) => protocolTotals[b] - protocolTotals[a])

		sortedProtocols.forEach((protocol, index) => {
			protocolColorMap[protocol] = COLOR_PALETTE[index % COLOR_PALETTE.length]
		})

		for (let i = 0; i < 7; i++) {
			const day = startOfWeek.add(i, 'day')
			const dateStr = day.format('YYYY-MM-DD')
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
		}

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
	}, [currentDate, viewMode, unlocksData])

	const monthlyChartData = React.useMemo(() => {
		if (viewMode !== 'month') return null

		const startOfMonth = currentDate.startOf('month')
		const endOfMonth = currentDate.endOf('month')
		const daysInMonth = endOfMonth.date()
		const monthData: Array<any> = []
		const protocolTotals: { [key: string]: number } = {}
		const protocolColorMap: { [key: string]: string } = {}

		for (let i = 1; i <= daysInMonth; i++) {
			const day = startOfMonth.date(i)
			const dateStr = day.format('YYYY-MM-DD')
			const dayData = unlocksData?.[dateStr]
			if (dayData?.events) {
				dayData.events.forEach((event) => {
					if (!protocolTotals[event.protocol]) {
						protocolTotals[event.protocol] = 0
					}
					protocolTotals[event.protocol] += event.value
				})
			}
		}

		const sortedProtocols = Object.keys(protocolTotals).sort((a, b) => protocolTotals[b] - protocolTotals[a])

		sortedProtocols.forEach((protocol, index) => {
			protocolColorMap[protocol] = COLOR_PALETTE[index % COLOR_PALETTE.length]
		})

		for (let i = 1; i <= daysInMonth; i++) {
			const day = startOfMonth.date(i)
			const dateStr = day.format('YYYY-MM-DD')
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
		}

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
	}, [currentDate, viewMode, unlocksData])

	const maxMonthlyValue = React.useMemo(() => {
		if (viewMode !== 'month') return 0
		const startOfMonth = currentDate.startOf('month')
		const endOfMonth = currentDate.endOf('month')
		let max = 0
		Object.entries(unlocksData || {}).forEach(([dateStr, dailyData]) => {
			const date = dayjs(dateStr)
			if (date.isBetween(startOfMonth.subtract(1, 'day'), endOfMonth.add(1, 'day'))) {
				if (dailyData.totalValue > max) {
					max = dailyData.totalValue
				}
			}
		})
		return max
	}, [currentDate, viewMode, unlocksData])

	return {
		weeklyChartData,
		monthlyChartData,
		maxMonthlyValue
	}
}
