import * as React from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, tokenIconUrl, slug } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { CustomLink } from '~/components/Link'
import dynamic from 'next/dynamic'

dayjs.extend(isBetween)

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), { ssr: false })
const UnlocksTreemapChart = dynamic(() => import('~/components/ECharts/UnlocksTreemapChart'), { ssr: false })

export interface DailyUnlocks {
	totalValue: number
	events: Array<{
		protocol: string
		value: number
		details: string
		unlockType: string
	}>
}

export interface CalendarViewProps {
	unlocksData: {
		[date: string]: DailyUnlocks
	}
}

const COLOR_PALETTE = [
	'#e41a1c',
	'#377eb8',
	'#4daf4a',
	'#984ea3',
	'#ff7f00',
	'#ffff33',
	'#a65628',
	'#f781bf',
	'#999999',
	'#66c2a5',
	'#fc8d62',
	'#8da0cb',
	'#e78ac3',
	'#a6d854',
	'#ffd92f'
]

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const generateCalendarDays = (date: Dayjs) => {
	const startOfMonth = date.startOf('month')
	const endOfMonth = date.endOf('month')
	const startDay = startOfMonth.day()
	const daysInMonth = endOfMonth.date()

	const days: Array<{ date: Dayjs | null; isCurrentMonth: boolean }> = []

	const prevMonth = date.subtract(1, 'month')
	const prevMonthEnd = prevMonth.endOf('month').date()
	for (let i = startDay - 1; i >= 0; i--) {
		days.push({
			date: prevMonth.date(prevMonthEnd - i),
			isCurrentMonth: false
		})
	}

	for (let i = 1; i <= daysInMonth; i++) {
		days.push({
			date: date.date(i),
			isCurrentMonth: true
		})
	}

	const remainingDays = 42 - days.length
	const nextMonth = date.add(1, 'month')
	for (let i = 1; i <= remainingDays; i++) {
		days.push({
			date: nextMonth.date(i),
			isCurrentMonth: false
		})
	}

	return days
}

const generateWeekDays = (date: Dayjs) => {
	const startOfWeek = date.startOf('week')
	const days: Array<{ date: Dayjs; isCurrentMonth: boolean }> = []

	for (let i = 0; i < 7; i++) {
		const day = startOfWeek.add(i, 'day')
		const isCurrentMonth = day.isSame(date, 'month')
		days.push({
			date: day,
			isCurrentMonth: isCurrentMonth
		})
	}
	return days
}

const interpolateColor = (rgb1: number[], rgb2: number[], factor: number): number[] => {
	const result = rgb1.slice()
	for (let i = 0; i < 3; i++) {
		result[i] = Math.round(result[i] + factor * 1.2 * (rgb2[i] - rgb1[i]))
	}
	return result
}

const renderDayCell = (
	dayInfo: { date: Dayjs | null; isCurrentMonth: boolean },
	unlocksData: CalendarViewProps['unlocksData'],
	maxUnlockValue: number
) => {
	if (!dayInfo.date)
		return <div className="h-24 w-full border border-[var(--divider)] bg-[var(--bg6)] opacity-40"></div>

	const dateStr = dayInfo.date.format('YYYY-MM-DD')
	const dayData = unlocksData[dateStr]
	const hasUnlocks = dayData && dayData.totalValue > 0
	const isToday = dayInfo.date.isSame(dayjs(), 'day')

	let intensityFactor = 0
	if (hasUnlocks && maxUnlockValue > 0 && dayInfo.isCurrentMonth) {
		const normalizedValue = Math.min(1, dayData.totalValue / maxUnlockValue)
		intensityFactor = Math.log1p(normalizedValue * 9) / Math.log1p(10)
		intensityFactor = Math.min(1, Math.max(0, intensityFactor))
	}

	const baseColorRgb = [30, 41, 59]
	const highlightColorRgb = [59, 130, 246]

	let interpolatedColorRgb = baseColorRgb
	if (dayInfo.isCurrentMonth && intensityFactor > 0) {
		interpolatedColorRgb = interpolateColor(baseColorRgb, highlightColorRgb, intensityFactor)
	}

	const textColorClass = 'text-[var(--text2)] opacity-80'

	const textColorClassToday = 'text-[var(--blue)]'

	const cellClasses = `h-24 w-full relative border transition-colors duration-150 ease-in-out ${
		isToday ? 'border-[var(--blue)]' : 'border-[var(--divider)]'
	} ${!dayInfo.isCurrentMonth ? 'bg-[var(--bg6)] opacity-60 hover:opacity-80' : 'hover:brightness-110'}` // Remove base bg-[var(--bg7)] if current month

	const cellStyle: React.CSSProperties = {}
	if (dayInfo.isCurrentMonth) {
		cellStyle.backgroundColor = `rgb(${interpolatedColorRgb.join(', ')})`
	}

	const cellContent = (
		<div className={cellClasses} style={cellStyle}>
			<div className="h-full w-full p-2 flex flex-col justify-between relative z-10">
				<span
					className={`text-sm font-medium ${
						isToday
							? `${textColorClassToday} font-bold` // Use dynamic text color for today
							: textColorClass // Use dynamic text color
					}`}
				>
					{dayInfo.date.date()}
				</span>
				{hasUnlocks && dayInfo.isCurrentMonth && (
					<>
						<div className={`text-xs mt-auto hidden sm:block truncate ${textColorClass}`}>
							Total: {formattedNum(dayData.totalValue, true)}
						</div>
					</>
				)}
			</div>
		</div>
	)

	if (!hasUnlocks) {
		return cellContent
	}

	return (
		<Tooltip
			content={
				<div className="flex flex-col gap-3 p-3 max-w-xs">
					<div className="font-semibold text-sm text-[var(--text1)]">
						Total Unlock Value: {formattedNum(dayData.totalValue, true)}
					</div>
					{dayData.events.length > 0 && (
						<>
							<div className="border-t border-[var(--divider)] -mx-3"></div>
							<div className="flex flex-col gap-2">
								{dayData.events.map((event, i) => (
									<div key={i} className="flex justify-between items-center gap-4 text-xs">
										<CustomLink
											href={`/unlocks/${slug(event.protocol)}`}
											target="_blank"
											className="flex items-center gap-1.5 text-[var(--text1)] hover:text-[var(--blue)] flex-shrink min-w-0 group"
										>
											<TokenLogo logo={tokenIconUrl(event.protocol)} size={16} />
											<span className="truncate group-hover:underline">{event.protocol}</span>
										</CustomLink>
										<span className="text-[var(--text2)] font-medium whitespace-nowrap">
											{formattedNum(event.value, true)}
										</span>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			}
		>
			{cellContent}
		</Tooltip>
	)
}

const renderListView = (events: Array<{ date: Dayjs; event: DailyUnlocks['events'][0] }>) => {
	if (events.length === 0) {
		return <div className="text-center text-[var(--text2)] p-8 text-lg">No unlocks found for the next 30 days.</div>
	}

	const groupedEvents: { [date: string]: Array<DailyUnlocks['events'][0]> } = {}
	events.forEach(({ date, event }) => {
		const dateStr = date.format('YYYY-MM-DD')
		if (!groupedEvents[dateStr]) {
			groupedEvents[dateStr] = []
		}
		groupedEvents[dateStr].push(event)
	})

	return (
		<div
			className="flex flex-col gap-2 p-1 overflow-y-auto max-h-[70vh] border border-[var(--divider)] rounded bg-[var(--bg7)]
						[&::-webkit-scrollbar]:w-2
						[&::-webkit-scrollbar-track]:bg-transparent
						[&::-webkit-scrollbar-thumb]:bg-[var(--blue)]
						[&::-webkit-scrollbar-thumb]:rounded-full
						[&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[var(--bg7)]
		"
		>
			{Object.entries(groupedEvents).map(([dateStr, dailyEvents], index) => (
				<div key={dateStr} className={`py-2 ${index > 0 ? 'border-t border-[var(--divider)]' : ''}`}>
					<h3 className="font-semibold text-base mb-3 sticky top-0 bg-[var(--bg6)] py-2 px-3 rounded-t-md z-10 border-b border-[var(--divider)] text-[var(--text1)]">
						{dayjs(dateStr).format('dddd, MMMM D, YYYY')}{' '}
						{dayjs(dateStr).isSame(dayjs(), 'day') && (
							<span className="text-xs font-normal text-[var(--blue)] ml-2">(Today)</span>
						)}
					</h3>
					<div className="flex flex-col gap-2 px-3">
						{dailyEvents.map((event, i) => (
							<CustomLink key={i} href={`/unlocks/${slug(event.protocol)}`} target="_blank">
								<div className="flex justify-between items-center p-3 rounded bg-[var(--bg6)] hover:bg-[var(--bg5)] transition-colors duration-150 ease-in-out shadow-sm cursor-pointer">
									<span className="flex items-center gap-3 text-sm font-medium text-[var(--text1)]">
										<TokenLogo logo={tokenIconUrl(event.protocol)} size={20} />
										{event.protocol}
									</span>
									<span className="text-sm font-medium text-[var(--text2)]">{formattedNum(event.value, true)}</span>
								</div>
							</CustomLink>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

const renderWeekDayColumn = (
	dayInfo: { date: Dayjs; isCurrentMonth: boolean },
	unlocksData: CalendarViewProps['unlocksData']
) => {
	const dateStr = dayInfo.date.format('YYYY-MM-DD')
	const dayData = unlocksData[dateStr]
	const hasUnlocks = dayData && dayData.events && dayData.events.length > 0
	const isToday = dayInfo.date.isSame(dayjs(), 'day')

	return (
		<div
			key={dateStr}
			className={`flex flex-col border border-[var(--divider)] bg-[var(--bg7)] p-3 min-h-[12rem] ${
				isToday ? 'border-[var(--blue)]' : ''
			}`}
		>
			<div className="text-sm font-medium mb-2 pb-2 border-b border-[var(--divider)] flex justify-between items-center">
				<span>
					<span className="text-[var(--text2)] mr-1.5">{dayInfo.date.format('ddd')}</span>
					<span className={isToday ? 'text-[var(--blue)] font-bold' : 'text-[var(--text1)]'}>
						{dayInfo.date.date()}
					</span>
				</span>
				{isToday && <span className="text-xs font-normal text-[var(--blue)]">(Today)</span>}
			</div>
			<div
				className="flex flex-col gap-1.5 overflow-y-auto flex-grow
				 [&::-webkit-scrollbar]:w-1.5
				 [&::-webkit-scrollbar-track]:bg-transparent
				 [&::-webkit-scrollbar-thumb]:bg-[var(--blue)]/[.5]
				 [&::-webkit-scrollbar-thumb]:rounded-full
				 [&:hover::-webkit-scrollbar-thumb]:bg-[var(--blue)]
				 pr-1 -mr-1"
			>
				{hasUnlocks && dayData ? (
					dayData.events.map((event, i) => (
						<CustomLink key={i} href={`/unlocks/${slug(event.protocol)}`} target="_blank">
							<div className="text-xs p-2 rounded-md bg-[var(--bg6)] hover:bg-[var(--bg5)] cursor-pointer transition-colors duration-150 ease-in-out shadow-sm">
								<div className="flex justify-between items-start gap-1 mb-0.5">
									<div className="font-medium text-[var(--text1)] flex items-center gap-1.5 min-w-0 flex-shrink">
										<TokenLogo logo={tokenIconUrl(event.protocol)} size={16} />
										<span className="truncate">{event.protocol}</span>
									</div>
									{event.unlockType && (
										<span className="px-1.5 py-0.5 rounded bg-[var(--bg5)] text-[var(--text2)] text-[0.6rem] sm:text-[0.65rem] font-medium whitespace-nowrap flex-shrink-0">
											{event.unlockType}
										</span>
									)}
								</div>
								<div className="text-[var(--text2)] pl-[calc(16px+0.375rem)]">{formattedNum(event.value, true)}</div>
							</div>
						</CustomLink>
					))
				) : (
					<div className="flex-grow flex items-center justify-center text-center text-xs text-[var(--text2)] opacity-75">
						No unlocks
					</div>
				)}
			</div>
		</div>
	)
}

export const CalendarView: React.FC<CalendarViewProps> = ({ unlocksData }) => {
	const [currentDate, setCurrentDate] = React.useState(dayjs())
	const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'list' | 'treemap'>('month')

	const calendarDays = React.useMemo(() => {
		if (viewMode === 'week') {
			return generateWeekDays(currentDate)
		}
		return generateCalendarDays(currentDate)
	}, [currentDate, viewMode])

	const listEventsData = React.useMemo(() => {
		if (viewMode !== 'list') return []

		const startDate = currentDate.startOf('day')
		const listDurationDays = 30
		const endDate = startDate.add(listDurationDays, 'days')
		const events: Array<{ date: Dayjs; event: DailyUnlocks['events'][0] }> = []

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

	const weeklyChartData = React.useMemo(() => {
		if (viewMode !== 'week') return null

		const startOfWeek = currentDate.startOf('week')
		const weekData: Array<any> = []
		const protocolTotals: { [key: string]: number } = {}
		const protocolColorMap: { [key: string]: string } = {}

		for (let i = 0; i < 7; i++) {
			const day = startOfWeek.add(i, 'day')
			const dateStr = day.format('YYYY-MM-DD')
			const dayData = unlocksData[dateStr]
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
			weekData.push(dataPoint)
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
			const dayData = unlocksData[dateStr]
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
		Object.entries(unlocksData).forEach(([dateStr, dailyData]) => {
			const date = dayjs(dateStr)
			if (date.isBetween(startOfMonth.subtract(1, 'day'), endOfMonth.add(1, 'day'))) {
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
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h2 className="text-xl font-medium">
					{viewMode === 'month'
						? currentDate.format('MMMM YYYY')
						: viewMode === 'week'
						? `${currentDate.startOf('week').format('MMM D')} - ${currentDate.endOf('week').format('MMM D, YYYY')}`
						: viewMode === 'treemap'
						? 'TreeMap Chart'
						: `Unlocks starting ${currentDate.format('MMM D, YYYY')} (Next 30 Days)`}
				</h2>
				<div className="text-xs font-medium ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]">
					<button
						onClick={() => setViewMode('month')}
						data-active={viewMode === 'month'}
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
					>
						Month
					</button>
					<button
						onClick={() => setViewMode('week')}
						data-active={viewMode === 'week'}
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
					>
						Week
					</button>
					<button
						onClick={() => setViewMode('week')}
						data-active={viewMode === 'treemap'}
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
					>
						TreeMap
					</button>
					<button
						onClick={() => setViewMode('list')}
						data-active={viewMode === 'list'}
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
					>
						List
					</button>
				</div>
				<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]">
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
								{renderDayCell(day as { date: Dayjs | null; isCurrentMonth: boolean }, unlocksData, maxMonthlyValue)}
							</React.Fragment>
						))}
					</div>
				</>
			) : viewMode === 'week' ? (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-px bg-[var(--divider)] border border-[var(--divider)]">
						{calendarDays.map((day, i) => (
							<React.Fragment key={day.date!.format('YYYY-MM-DD')}>
								{renderWeekDayColumn(day as { date: Dayjs; isCurrentMonth: boolean }, unlocksData)}
							</React.Fragment>
						))}
					</div>
				</>
			) : (
				renderListView(listEventsData)
			)}
		</div>
	)
}
