import type { Dayjs } from 'dayjs'

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

export interface DayInfo {
	date: Dayjs | null
	isCurrentMonth: boolean
}
