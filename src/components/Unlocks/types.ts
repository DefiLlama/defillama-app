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

export interface PrecomputedData {
	monthlyMaxValues: { [monthKey: string]: number }
	listEvents: { [startDateKey: string]: Array<{ date: string; event: any }> }
}

export interface UnlocksData {
	[date: string]: {
		totalValue: number
		events: Array<{
			protocol: string
			value: number
			details: string
			category?: string
			unlockType: string
		}>
	}
}

export interface CalendarViewProps {
	initialUnlocksData: UnlocksData
	precomputedData?: PrecomputedData
}

export interface DayInfo {
	date: Dayjs | null
	isCurrentMonth: boolean
}
