import * as React from 'react'
import { lazy, Suspense } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { useWatchlistManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'
import { Icon } from '../Icon'
import { TagGroup } from '../TagGroup'
import { CalendarDayCell } from './components/CalendarDayCell'
import { UnlocksListView } from './components/UnlocksListView'
import { WeekDayColumn } from './components/WeekDayColumn'
import { DAYS_OF_WEEK } from './constants'
import { useUnlockChartData } from './hooks/useUnlockChartData'
import { CalendarViewProps, DailyUnlocks, DayInfo } from './types'
import { generateCalendarDays, generateWeekDays } from './utils/calendarUtils'

dayjs.extend(isBetween)

const BarChart = lazy(() => import('~/components/ECharts/BarChart'))
const UnlocksTreemapChart = lazy(() => import('~/components/ECharts/UnlocksTreemapChart'))

const VIEW_MODES = ['Month', 'Week', 'TreeMap', 'List'] as const

export const CalendarView: React.FC<CalendarViewProps> = ({ initialUnlocksData, precomputedData }) => {
	const [showOnlyWatchlist, setShowOnlyWatchlist] = React.useState(false)
	const [showOnlyInsider, setShowOnlyInsider] = React.useState(false)
	const [currentDate, setCurrentDate] = React.useState(dayjs())
	const [viewMode, setViewMode] = React.useState<(typeof VIEW_MODES)[number]>('Month')

	const { savedProtocols } = useWatchlistManager('defi')

	const unlocksData: {
		[date: string]: DailyUnlocks
	} = React.useMemo(() => {
		let filteredData = initialUnlocksData
		if (!filteredData) return {}

		if (showOnlyWatchlist || showOnlyInsider) {
			filteredData = {}
			Object.entries(initialUnlocksData).forEach(([date, dailyData]) => {
				let filteredEvents = dailyData.events

				if (showOnlyWatchlist) {
					filteredEvents = filteredEvents.filter((event) => savedProtocols.has(event.protocol))
				}

				if (showOnlyInsider) {
					filteredEvents = filteredEvents.filter((event) => event.category === 'insiders')
				}

				if (filteredEvents.length > 0) {
					filteredData[date] = {
						...dailyData,
						events: filteredEvents,
						totalValue: filteredEvents.reduce((sum, event) => sum + event.value, 0)
					}
				}
			})
		}

		return filteredData
	}, [initialUnlocksData, showOnlyWatchlist, showOnlyInsider, savedProtocols])

	const calendarDays = React.useMemo(() => {
		if (viewMode === 'TreeMap' || viewMode === 'List') return []

		if (viewMode === 'Week') {
			return generateWeekDays(currentDate) as DayInfo[]
		}
		return generateCalendarDays(currentDate) as DayInfo[]
	}, [currentDate, viewMode])

	const listEventsData = React.useMemo(() => {
		if (viewMode !== 'List') return []

		const startDate = currentDate.startOf('day')
		const startDateKey = startDate.format('YYYY-MM-DD')

		if (precomputedData?.listEvents[startDateKey]) {
			return precomputedData.listEvents[startDateKey].map(({ date, event }) => ({
				date: dayjs(date),
				event
			}))
		}

		const listDurationDays = 30
		const endDate = startDate.add(listDurationDays, 'days')
		const events: Array<{ date: Dayjs; event: any }> = []

		Object.entries(unlocksData || {}).forEach(([dateStr, dailyData]) => {
			const date = dayjs(dateStr)
			if (date.isBetween(startDate.subtract(1, 'day'), endDate)) {
				dailyData.events.forEach((event) => {
					events.push({ date, event })
				})
			}
		})

		events.sort((a, b) => a.date.valueOf() - b.date.valueOf())

		return events
	}, [currentDate, viewMode, unlocksData, precomputedData])

	const { weeklyChartData, monthlyChartData } = useUnlockChartData({
		currentDate,
		viewMode,
		unlocksData,
		precomputedData
	})

	const maxMonthlyValue = React.useMemo(() => {
		if (viewMode !== 'Month') return 0

		const monthKey = `${currentDate.year()}-${currentDate.month().toString().padStart(2, '0')}`

		if (precomputedData?.monthlyMaxValues[monthKey] !== undefined) {
			return precomputedData.monthlyMaxValues[monthKey]
		}

		const startOfMonth = currentDate.startOf('month')
		const endOfMonth = currentDate.endOf('month')
		let max = 0
		Object.entries(unlocksData || {}).forEach(([dateStr, dailyData]) => {
			const date = dayjs(dateStr)
			if (
				date.isSame(startOfMonth, 'day') ||
				date.isSame(endOfMonth, 'day') ||
				date.isBetween(startOfMonth, endOfMonth)
			) {
				if (dailyData.totalValue > max) {
					max = dailyData.totalValue
				}
			}
		})
		return max
	}, [currentDate, viewMode, unlocksData, precomputedData])

	const next = React.useCallback(() => {
		const duration = viewMode === 'List' ? 30 : 1
		const unit = (viewMode === 'List' ? 'day' : viewMode === 'TreeMap' ? 'year' : viewMode.toLowerCase()) as
			| 'day'
			| 'week'
			| 'month'
			| 'year'
		setCurrentDate((prev) => prev.add(duration, unit))
	}, [viewMode])

	const prev = React.useCallback(() => {
		const duration = viewMode === 'List' ? 30 : 1
		const unit = (viewMode === 'List' ? 'day' : viewMode === 'TreeMap' ? 'year' : viewMode.toLowerCase()) as
			| 'day'
			| 'week'
			| 'month'
			| 'year'
		setCurrentDate((prev) => prev.subtract(duration, unit))
	}, [viewMode])

	const goToToday = React.useCallback(() => {
		setCurrentDate(dayjs())
	}, [])

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="text-lg font-semibold">
					{viewMode === 'Month'
						? currentDate.format('MMMM YYYY')
						: viewMode === 'Week'
							? `${currentDate.startOf('week').format('MMM D')} - ${currentDate.endOf('week').format('MMM D, YYYY')}`
							: viewMode === 'TreeMap'
								? 'TreeMap Chart'
								: `Unlocks starting ${currentDate.format('MMM D, YYYY')} (Next 30 Days)`}
				</h2>
				<TagGroup
					selectedValue={viewMode}
					setValue={(value: (typeof VIEW_MODES)[number]) => setViewMode(value)}
					values={VIEW_MODES as unknown as string[]}
					className="ml-auto"
				/>
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					<button
						onClick={prev}
						className="shrink-0 px-3 py-1.5 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						aria-label={`Previous ${viewMode === 'List' ? '30 days' : viewMode}`}
					>
						←
					</button>
					<button
						onClick={goToToday}
						className="shrink-0 px-3 py-1.5 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					>
						Today
					</button>
					<button
						onClick={next}
						className="shrink-0 px-3 py-1.5 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						aria-label={`Next ${viewMode === 'List' ? '30 days' : viewMode}`}
					>
						→
					</button>
				</div>
				<button
					onClick={() => setShowOnlyWatchlist((prev) => !prev)}
					className="flex items-center justify-center gap-2 rounded-md border border-(--form-control-border) bg-white px-3 py-1.5 text-xs text-black dark:bg-black dark:text-white"
				>
					<Icon
						name="bookmark"
						height={16}
						width={16}
						style={{ fill: showOnlyWatchlist ? 'var(--text-primary)' : 'none' }}
					/>
					{showOnlyWatchlist ? 'Show All' : 'Show Watchlist'}
				</button>
				<button
					onClick={() => setShowOnlyInsider((prev) => !prev)}
					className="flex items-center justify-center gap-2 rounded-md border border-(--form-control-border) bg-white px-3 py-1.5 text-xs text-black dark:bg-black dark:text-white"
				>
					<Icon name="key" height={16} width={16} style={{ fill: showOnlyInsider ? 'var(--text-primary)' : 'none' }} />
					{showOnlyInsider ? 'Show All' : 'Show Insiders Only'}
				</button>
			</div>

			{viewMode === 'Week' && weeklyChartData && (
				<Suspense fallback={<div className="min-h-[398px]" />}>
					<BarChart
						chartData={weeklyChartData.chartData}
						stacks={weeklyChartData.stacks}
						stackColors={weeklyChartData.stackColors}
						valueSymbol="$"
						height="360px"
						chartOptions={chartOptions}
					/>
				</Suspense>
			)}

			{viewMode === 'TreeMap' ? (
				<Suspense fallback={<div className="min-h-[600px]" />}>
					<UnlocksTreemapChart unlocksData={unlocksData} height="600px" filterYear={currentDate.year()} />
				</Suspense>
			) : viewMode === 'Month' ? (
				<>
					{monthlyChartData && (
						<Suspense fallback={<div className="min-h-[398px]" />}>
							<BarChart
								chartData={monthlyChartData.chartData}
								stacks={monthlyChartData.stacks}
								stackColors={monthlyChartData.stackColors}
								valueSymbol="$"
								height="360px"
								chartOptions={chartOptions}
							/>
						</Suspense>
					)}
					<div className="grid grid-cols-7 py-2 text-center text-sm font-medium text-(--text-secondary)">
						{DAYS_OF_WEEK.map((day) => (
							<div key={day}>{day}</div>
						))}
					</div>
					<div className="grid grid-cols-7 grid-rows-6 gap-px border border-(--divider) bg-(--divider)">
						{calendarDays.map((day, i) => (
							<React.Fragment key={day.date?.format('YYYY-MM-DD') ?? i}>
								<CalendarDayCell dayInfo={day} unlocksData={unlocksData} maxUnlockValue={maxMonthlyValue} />
							</React.Fragment>
						))}
					</div>
				</>
			) : viewMode === 'Week' ? (
				<>
					<div className="grid grid-cols-1 gap-px border border-(--divider) bg-(--divider) md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
						{calendarDays.map((day, i) => (
							<React.Fragment key={day.date!.format('YYYY-MM-DD')}>
								<WeekDayColumn dayInfo={day as { date: Dayjs; isCurrentMonth: boolean }} unlocksData={unlocksData} />
							</React.Fragment>
						))}
					</div>
				</>
			) : (
				<UnlocksListView events={listEventsData} />
			)}
		</div>
	)
}

const chartOptions = {
	tooltip: {
		trigger: 'axis',
		formatter: (params: any) => {
			if (!params || params.length === 0) return ''

			const dateStr = dayjs(params[0].value[0]).format('MMM D, YYYY')
			let tooltipContent = `<div class="font-semibold mb-1">${dateStr}</div>`
			let totalValue = 0

			const validParams = params
				.filter((param) => param.value && param.value[1] > 0)
				.sort((a, b) => b.value[1] - a.value[1])

			if (validParams.length === 0) {
				tooltipContent += 'No unlocks'
			} else {
				validParams.forEach((param) => {
					const value = param.value[1]
					totalValue += value
					tooltipContent += `<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
					<span>${param.marker} ${param.seriesName}</span>
					<span style="font-weight: 500;">${formattedNum(value, true)}</span>
				</div>`
				})
				if (validParams.length > 1) {
					tooltipContent += `<div style="border-top: 1px solid var(--divider); margin-top: 4px; padding-top: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
					<span><strong>Total</strong></span>
					<span style="font-weight: 600;">${formattedNum(totalValue, true)}</span>
				</div>`
				}
			}

			return `<div style="font-size: 0.75rem; line-height: 1rem;">${tooltipContent}</div>`
		}
	},
	legend: {
		type: 'scroll',
		itemGap: 15,
		top: 0,
		bottom: 0,
		left: 12,
		right: 12
	},
	grid: {
		top: 40,
		right: 12,
		bottom: 68,
		left: 12,
		outerBoundsMode: 'same',
		outerBoundsContain: 'axisLabel'
	},
	xAxis: {
		type: 'time'
	}
}
