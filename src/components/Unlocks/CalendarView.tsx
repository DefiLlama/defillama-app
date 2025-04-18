import * as React from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { formattedNum } from '~/utils'
import dynamic from 'next/dynamic'
import { generateCalendarDays, generateWeekDays } from './utils/calendarUtils'
import { DAYS_OF_WEEK } from './constants'
import { CalendarViewProps, DayInfo } from './types'
import { useUnlockChartData } from './hooks/useUnlockChartData'
import { CalendarDayCell } from './components/CalendarDayCell'
import { WeekDayColumn } from './components/WeekDayColumn'
import { UnlocksListView } from './components/UnlocksListView'

dayjs.extend(isBetween)

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), { ssr: false })
const UnlocksTreemapChart = dynamic(() => import('~/components/ECharts/UnlocksTreemapChart'), { ssr: false })

export const CalendarView: React.FC<CalendarViewProps> = ({ unlocksData }) => {
	const [currentDate, setCurrentDate] = React.useState(dayjs())
	const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'list' | 'treemap'>('month')

	const calendarDays = React.useMemo(() => {
		if (viewMode === 'week') {
			return generateWeekDays(currentDate) as DayInfo[]
		}
		return generateCalendarDays(currentDate) as DayInfo[]
	}, [currentDate, viewMode])

	const listEventsData = React.useMemo(() => {
		if (viewMode !== 'list') return []

		const startDate = currentDate.startOf('day')
		const listDurationDays = 30
		const endDate = startDate.add(listDurationDays, 'days')
		const events: Array<{ date: Dayjs; event: any }> = []

		Object.entries(unlocksData).forEach(([dateStr, dailyData]) => {
			const date = dayjs(dateStr)
			if (date.isBetween(startDate.subtract(1, 'day'), endDate)) {
				dailyData.events.forEach((event) => {
					events.push({ date, event })
				})
			}
		})

		events.sort((a, b) => a.date.valueOf() - b.date.valueOf())

		return events
	}, [currentDate, viewMode, unlocksData])

	const { weeklyChartData, monthlyChartData } = useUnlockChartData({ currentDate, viewMode, unlocksData })

	const maxMonthlyValue = React.useMemo(() => {
		if (viewMode !== 'month') return 0
		const startOfMonth = currentDate.startOf('month')
		const endOfMonth = currentDate.endOf('month')
		let max = 0
		Object.entries(unlocksData).forEach(([dateStr, dailyData]) => {
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
	}, [currentDate, viewMode, unlocksData])

	const next = () => {
		const duration = viewMode === 'list' ? 30 : 1
		const unit = viewMode === 'list' ? 'day' : viewMode === 'treemap' ? 'year' : viewMode
		setCurrentDate(currentDate.add(duration, unit))
	}

	const prev = () => {
		const duration = viewMode === 'list' ? 30 : 1
		const unit = viewMode === 'list' ? 'day' : viewMode === 'treemap' ? 'year' : viewMode
		setCurrentDate(currentDate.subtract(duration, unit))
	}

	return (
		<div className="flex flex-col gap-6 rounded-lg bg-[var(--bg6)] p-4">
			<h1 className="text-xl font-medium">
				{viewMode === 'month'
					? currentDate.format('MMMM YYYY')
					: viewMode === 'week'
					? `${currentDate.startOf('week').format('MMM D')} - ${currentDate.endOf('week').format('MMM D, YYYY')}`
					: viewMode === 'treemap'
					? `TreeMap Chart`
					: `Unlocks starting ${currentDate.format('MMM D, YYYY')} (Next 30 Days)`}
			</h1>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center border-b border-[var(--divider)] w-full">
					<button
						onClick={() => setViewMode('month')}
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ease-in-out ${
							viewMode === 'month'
								? 'border-[var(--blue)] text-[var(--blue)]'
								: 'border-transparent text-[var(--text2)] hover:text-[var(--text1)]'
						}`}
					>
						Month
					</button>
					<button
						onClick={() => setViewMode('week')}
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ease-in-out ${
							viewMode === 'week'
								? 'border-[var(--blue)] text-[var(--blue)]'
								: 'border-transparent text-[var(--text2)] hover:text-[var(--text1)]'
						}`}
					>
						Week
					</button>
					<button
						onClick={() => setViewMode('treemap')}
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ease-in-out ${
							viewMode === 'treemap'
								? 'border-[var(--blue)] text-[var(--blue)]'
								: 'border-transparent text-[var(--text2)] hover:text-[var(--text1)]'
						}`}
					>
						TreeMap
					</button>
					<button
						onClick={() => setViewMode('list')}
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ease-in-out ${
							viewMode === 'list'
								? 'border-[var(--blue)] text-[var(--blue)]'
								: 'border-transparent text-[var(--text2)] hover:text-[var(--text1)]'
						}`}
					>
						List
					</button>
				</div>
				<div className={`flex gap-2 ml-auto pl-4 ${viewMode === 'treemap' ? 'opacity-0' : ''}`}>
					<button
						onClick={prev}
						className="p-2 rounded hover:bg-[var(--bg7)] text-[var(--text2)] hover:text-[var(--text1)]"
						aria-label={`Previous ${viewMode === 'list' ? '30 days' : viewMode}`}
					>
						←
					</button>
					<button
						onClick={() => setCurrentDate(dayjs())}
						className="px-3 py-1 rounded hover:bg-[var(--bg7)] text-[var(--text2)] hover:text-[var(--text1)]"
					>
						Today
					</button>
					<button
						onClick={next}
						className="p-2 rounded hover:bg-[var(--bg7)] text-[var(--text2)] hover:text-[var(--text1)]"
						aria-label={`Next ${viewMode === 'list' ? '30 days' : viewMode}`}
					>
						→
					</button>
				</div>
			</div>

			{viewMode === 'week' && weeklyChartData && (
				<div className="mb-4">
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
				</div>
			)}

			{viewMode === 'treemap' ? (
				<UnlocksTreemapChart unlocksData={unlocksData} height="600px" filterYear={currentDate.year()} />
			) : viewMode === 'month' ? (
				<>
					{monthlyChartData && (
						<div className="mb-4">
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
						</div>
					)}
					<div className="grid grid-cols-7 text-center text-sm text-[var(--text2)] font-medium py-2">
						{DAYS_OF_WEEK.map((day) => (
							<div key={day}>{day}</div>
						))}
					</div>
					<div className="grid grid-cols-7 grid-rows-6 gap-px bg-[var(--divider)] border border-[var(--divider)]">
						{calendarDays.map((day, i) => (
							<React.Fragment key={day.date?.format('YYYY-MM-DD') ?? i}>
								<CalendarDayCell dayInfo={day} unlocksData={unlocksData} maxUnlockValue={maxMonthlyValue} />
							</React.Fragment>
						))}
					</div>
				</>
			) : viewMode === 'week' ? (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-px bg-[var(--divider)] border border-[var(--divider)]">
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
