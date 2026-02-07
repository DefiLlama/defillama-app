import type { Dayjs } from 'dayjs'
import * as React from 'react'
import type { DailyUnlocks, PrecomputedData, UnlocksMultiSeriesChart } from '../types'
import { buildUnlocksMultiSeriesChartForDateRange } from '../utils/buildUnlocksMultiSeriesChart'

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
	precomputedData: _precomputedData
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

	const weeklyChart = React.useMemo<UnlocksMultiSeriesChart | null>(() => {
		if (viewMode !== 'Week' || !weekRange) return null

		const weekKey = weekRange.start.format('YYYY-MM-DD')
		const cached = _precomputedData?.weekCharts?.[weekKey]
		if (cached) return cached

		return buildUnlocksMultiSeriesChartForDateRange({
			dates: weekRange.dates,
			unlocksData
		})
	}, [viewMode, weekRange, unlocksData, _precomputedData])

	const monthlyChart = React.useMemo<UnlocksMultiSeriesChart | null>(() => {
		if (viewMode !== 'Month' || !monthRange) return null

		const monthKey = `${currentDate.year()}-${currentDate.month().toString().padStart(2, '0')}`
		const cached = _precomputedData?.monthCharts?.[monthKey]
		if (cached) return cached

		return buildUnlocksMultiSeriesChartForDateRange({
			dates: monthRange.dates,
			unlocksData
		})
	}, [viewMode, monthRange, unlocksData, currentDate, _precomputedData])

	return {
		weeklyChart,
		monthlyChart
	}
}
