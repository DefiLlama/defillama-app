import type { TimeSeriesEntry } from './api.types'

/** A row in the pctChanges table (category or coin) */
export interface IPctChangeRow {
	id: string
	name: string
	mcap: number
	volume1D: number | null
	nbCoins?: number
	categoryName?: string
	change1W: number | null
	change1M: number | null
	change1Y: number | null
	changeYtd: number | null
	change?: number | null
	returnField?: number | null
}

/** Performance time series keyed by period string */
export type PerformanceTimeSeries = Record<string, TimeSeriesEntry[]>

/** Props for the CategoryPerformanceContainer */
export interface CategoryPerformanceProps {
	pctChanges: IPctChangeRow[]
	performanceTimeSeries: PerformanceTimeSeries
	areaChartLegend: string[]
	isCoinPage: boolean
	categoryName?: string
}
