import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import type { DayInfo } from '../types'

dayjs.extend(isBetween)

export const generateCalendarDays = (date: Dayjs): DayInfo[] => {
	const startOfMonth = date.startOf('month')
	const endOfMonth = date.endOf('month')
	const startDay = startOfMonth.day()
	const daysInMonth = endOfMonth.date()

	const days: DayInfo[] = []

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

export const generateWeekDays = (date: Dayjs): DayInfo[] => {
	const startOfWeek = date.startOf('week')
	const days: DayInfo[] = []

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
