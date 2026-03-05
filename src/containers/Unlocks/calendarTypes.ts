import type { Dayjs } from 'dayjs'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'

export type UnlocksMultiSeriesChart = {
	dataset: MultiSeriesChart2Dataset
	charts: NonNullable<IMultiSeriesChart2Props['charts']>
}

export interface CalendarUnlockEvent {
	protocol: string
	value: number
	details: string
	unlockType: string
	category?: string
}

export interface DailyUnlocks {
	totalValue: number
	events: Array<CalendarUnlockEvent>
}

export interface PrecomputedData {
	monthlyMaxValues: { [monthKey: string]: number }
	listEvents: { [startDateKey: string]: Array<{ date: string; event: CalendarUnlockEvent }> }
	/**
	 * Optional precomputed chart payloads keyed by:
	 * - `weekCharts`: start-of-week date key (`YYYY-MM-DD`)
	 * - `monthCharts`: month key (`YYYY-${MM}` where `MM` is 0-based, `00`-`11`)
	 */
	weekCharts?: Record<string, UnlocksMultiSeriesChart>
	monthCharts?: Record<string, UnlocksMultiSeriesChart>
}

export interface UnlocksData {
	[date: string]: {
		totalValue: number
		events: Array<CalendarUnlockEvent>
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
