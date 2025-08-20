import * as React from 'react'
import { lazy, Suspense } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { LazyChart } from '~/components/LazyChart'
import { formattedNum } from '~/utils'
import { CalendarDayCell } from './components/CalendarDayCell'
import { UnlocksListView } from './components/UnlocksListView'
import { WeekDayColumn } from './components/WeekDayColumn'
import { DAYS_OF_WEEK } from './constants'
import { useUnlockChartData } from './hooks/useUnlockChartData'
import { CalendarViewProps, DayInfo } from './types'
import { generateCalendarDays, generateWeekDays } from './utils/calendarUtils'

dayjs.extend(isBetween)

const BarChart = lazy(() => import('~/components/ECharts/BarChart'))
const UnlocksTreemapChart = lazy(() => import('~/components/ECharts/UnlocksTreemapChart'))

export const CalendarView: React.FC<CalendarViewProps> = ({ unlocksData, precomputedData }) => {
	const [currentDate, setCurrentDate] = React.useState(dayjs())
	const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'list' | 'treemap'>('month')

	const calendarDays = React.useMemo(() => {
		if (viewMode === 'list' || viewMode === 'treemap') return []

		if (viewMode === 'week') {
			return generateWeekDays(currentDate) as DayInfo[]
		}
		return generateCalendarDays(currentDate) as DayInfo[]
	}, [currentDate, viewMode])

	const listEventsData = React.useMemo(() => {
		if (viewMode !== 'list') return []

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
		if (viewMode !== 'month') return 0

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
		const duration = viewMode === 'list' ? 30 : 1
		const unit = viewMode === 'list' ? 'day' : viewMode === 'treemap' ? 'year' : viewMode
		setCurrentDate((prev) => prev.add(duration, unit))
	}, [viewMode])

	const prev = React.useCallback(() => {
		const duration = viewMode === 'list' ? 30 : 1
		const unit = viewMode === 'list' ? 'day' : viewMode === 'treemap' ? 'year' : viewMode
		setCurrentDate((prev) => prev.subtract(duration, unit))
	}, [viewMode])

	const goToToday = React.useCallback(() => {
		setCurrentDate(dayjs())
	}, [])

	const handleViewModeChange = React.useCallback((newMode: 'month' | 'week' | 'list' | 'treemap') => {
		setViewMode(newMode)
	}, [])

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="text-xl font-medium">
					{viewMode === 'month'
						? currentDate.format('MMMM YYYY')
						: viewMode === 'week'
							? `${currentDate.startOf('week').format('MMM D')} - ${currentDate.endOf('week').format('MMM D, YYYY')}`
							: viewMode === 'treemap'
								? 'TreeMap Chart'
								: `Unlocks starting ${currentDate.format('MMM D, YYYY')} (Next 30 Days)`}
				</h2>
				<div className="ml-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					<button
						onClick={() => handleViewModeChange('month')}
						data-active={viewMode === 'month'}
						className="shrink-0 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						Month
					</button>
					<button
						onClick={() => handleViewModeChange('week')}
						data-active={viewMode === 'week'}
						className="shrink-0 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						Week
					</button>
					<button
						onClick={() => handleViewModeChange('treemap')}
						data-active={viewMode === 'treemap'}
						className="shrink-0 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						TreeMap
					</button>
					<button
						onClick={() => handleViewModeChange('list')}
						data-active={viewMode === 'list'}
						className="shrink-0 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						List
					</button>
				</div>
				<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					<button
						onClick={prev}
						className="rounded-sm p-2 text-(--text-secondary) hover:bg-(--bg-glass) hover:text-(--text-primary)"
						aria-label={`Previous ${viewMode === 'list' ? '30 days' : viewMode}`}
					>
						←
					</button>
					<button
						onClick={goToToday}
						className="rounded-sm px-3 py-1 text-(--text-secondary) hover:bg-(--bg-glass) hover:text-(--text-primary)"
					>
						Today
					</button>
					<button
						onClick={next}
						className="rounded-sm p-2 text-(--text-secondary) hover:bg-(--bg-glass) hover:text-(--text-primary)"
						aria-label={`Next ${viewMode === 'list' ? '30 days' : viewMode}`}
					>
						→
					</button>
				</div>
			</div>

			{viewMode === 'week' && weeklyChartData && (
				<div className="mb-4 min-h-[350px]">
					<LazyChart>
						<Suspense fallback={<></>}>
							<BarChart
								chartData={weeklyChartData.chartData}
								stacks={weeklyChartData.stacks}
								stackColors={weeklyChartData.stackColors}
								valueSymbol="$"
								height="300px"
								chartOptions={{
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
										bottom: 0,
										left: 'center',
										itemGap: 15
									},
									grid: {
										bottom: 40
									}
								}}
							/>
						</Suspense>
					</LazyChart>
				</div>
			)}

			{viewMode === 'treemap' ? (
				<LazyChart className="h-[600px]">
					<Suspense fallback={<></>}>
						<UnlocksTreemapChart unlocksData={unlocksData} height="600px" filterYear={currentDate.year()} />
					</Suspense>
				</LazyChart>
			) : viewMode === 'month' ? (
				<>
					{monthlyChartData && (
						<div className="mb-4 min-h-[350px]">
							<LazyChart>
								<Suspense fallback={<></>}>
									<BarChart
										chartData={monthlyChartData.chartData}
										stacks={monthlyChartData.stacks}
										stackColors={monthlyChartData.stackColors}
										valueSymbol="$"
										height="300px"
										chartOptions={{
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
												bottom: 0,
												left: 'center',
												itemGap: 15
											},
											grid: {
												bottom: 40
											},
											xAxis: {
												type: 'time'
											}
										}}
									/>
								</Suspense>
							</LazyChart>
						</div>
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
			) : viewMode === 'week' ? (
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
