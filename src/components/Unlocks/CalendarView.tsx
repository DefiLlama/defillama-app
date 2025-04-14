import * as React from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum } from '~/utils'

interface DailyUnlocks {
	totalValue: number
	events: Array<{
		protocol: string
		value: number
		details: string
	}>
}

interface CalendarViewProps {
	unlocksData: {
		[date: string]: DailyUnlocks
	}
}

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

export const CalendarView: React.FC<CalendarViewProps> = ({ unlocksData }) => {
	const [currentDate, setCurrentDate] = React.useState(dayjs())

	const calendarDays = React.useMemo(() => generateCalendarDays(currentDate), [currentDate])

	const nextMonth = () => setCurrentDate(currentDate.add(1, 'month'))
	const prevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'))

	const getCircleSize = (value: number) => {
		if (!value) return 0
		const size = Math.log2(1 + value / 25_000_000) * 12
		return Math.max(8, Math.min(48, size))
	}

	const renderDayCell = (dayInfo: { date: Dayjs | null; isCurrentMonth: boolean }) => {
		if (!dayInfo.date) return null

		const dateStr = dayInfo.date.format('YYYY-MM-DD')
		const dayData = unlocksData[dateStr]
		const hasUnlocks = dayData && dayData.totalValue > 0

		return (
			<div
				key={dateStr}
				className={`relative h-24 p-2 border border-[var(--divider)] flex flex-col justify-between ${
					dayInfo.isCurrentMonth ? 'bg-[var(--bg7)]' : 'bg-[var(--bg6)] opacity-50'
				}`}
			>
				<span
					className={`text-sm ${
						dayInfo.date.isSame(dayjs(), 'day')
							? 'font-bold text-[var(--blue)]'
							: dayInfo.isCurrentMonth
							? 'text-[var(--text1)]'
							: 'text-[var(--text2)]'
					}`}
				>
					{dayInfo.date.date()}
				</span>
				{hasUnlocks && (
					<>
						<Tooltip
							content={
								<div className="flex flex-col gap-2">
									<div className="font-bold">Total Value: {formattedNum(dayData.totalValue, true)}</div>
									<div className="flex flex-col gap-1">
										{dayData.events.map((event, i) => (
											<div key={i} className="flex justify-between gap-4">
												<span>{event.protocol}:</span>
												<span>{formattedNum(event.value, true)}</span>
											</div>
										))}
									</div>
								</div>
							}
						>
							<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
								<div
									className="rounded-full bg-[var(--blue)]"
									style={{
										width: `${getCircleSize(dayData.totalValue)}px`,
										height: `${getCircleSize(dayData.totalValue)}px`
									}}
								/>
							</div>
						</Tooltip>
						<div className="text-xs text-[var(--text2)] mt-auto hidden sm:block">
							Total: {formattedNum(dayData.totalValue, true)}
						</div>
					</>
				)}
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-6 rounded-lg bg-[var(--bg6)] p-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-medium">{currentDate.format('MMMM YYYY')}</h2>
				<div className="flex gap-2">
					<button
						onClick={prevMonth}
						className="p-2 rounded hover:bg-[var(--bg7)] text-[var(--text2)] hover:text-[var(--text1)]"
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
						onClick={nextMonth}
						className="p-2 rounded hover:bg-[var(--bg7)] text-[var(--text2)] hover:text-[var(--text1)]"
					>
						→
					</button>
				</div>
			</div>

			<div className="grid grid-cols-7 text-center text-sm text-[var(--text2)] font-medium py-2">
				{DAYS_OF_WEEK.map((day) => (
					<div key={day}>{day}</div>
				))}
			</div>
			<div className="grid grid-cols-7 gap-px bg-[var(--divider)]">
				{calendarDays.map((day, i) => (
					<React.Fragment key={i}>{renderDayCell(day)}</React.Fragment>
				))}
			</div>
		</div>
	)
}
