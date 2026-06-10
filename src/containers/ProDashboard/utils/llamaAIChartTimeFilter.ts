import dayjs from 'dayjs'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import type { CustomTimePeriod, TimePeriod } from '../dashboardReducer'

const DATE_LIKE_FIELD_RE = /(^|_)(date|day|month|time|timestamp)$/i

function parseRowTimestampSec(value: unknown): number | null {
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return null
		return value.toString().length <= 10 ? value : Math.floor(value / 1000)
	}

	if (typeof value !== 'string') return null

	const trimmed = value.trim()
	if (!trimmed) return null

	if (/^\d{10}$/.test(trimmed)) return Number(trimmed)
	if (/^\d{13}$/.test(trimmed)) return Math.floor(Number(trimmed) / 1000)

	const isoMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/)
	if (isoMonthMatch) {
		const year = Number(isoMonthMatch[1])
		const month = Number(isoMonthMatch[2])
		if (month < 1 || month > 12) return null
		return Math.floor(Date.UTC(year, month - 1, 1) / 1000)
	}

	const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (isoDateMatch) {
		const year = Number(isoDateMatch[1])
		const month = Number(isoDateMatch[2])
		const day = Number(isoDateMatch[3])
		if (month < 1 || month > 12 || day < 1 || day > 31) return null
		const date = new Date(Date.UTC(year, month - 1, day))
		if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
		return Math.floor(date.getTime() / 1000)
	}

	const parsed = Date.parse(trimmed)
	if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000)

	return null
}

function getTimeField(config: ChartConfiguration): string {
	return config.dataTransformation?.timeField || config.axes.x.field
}

function isTimeSeriesChart(config: ChartConfiguration, rows: any[]): boolean {
	if (config.axes.x.type === 'time') return true
	if (config.type === 'pie' || config.type === 'hbar') return false

	const timeField = getTimeField(config)
	if (config.axes.x.type !== 'category' || !DATE_LIKE_FIELD_RE.test(timeField)) return false

	const values = rows.map((row) => row?.[timeField]).filter((value) => value != null && String(value).trim().length > 0)

	if (values.length === 0) return false

	return values.every((value) => parseRowTimestampSec(value) != null)
}

export function getTimePeriodBounds(
	timePeriod: TimePeriod,
	customPeriod?: CustomTimePeriod | null
): { start: number; end: number } | null {
	if (timePeriod === 'all') return null

	if (timePeriod === 'custom' && customPeriod) {
		if (customPeriod.type === 'relative' && customPeriod.relativeDays) {
			return { start: dayjs().subtract(customPeriod.relativeDays, 'day').unix(), end: Infinity }
		}
		if (customPeriod.type === 'absolute' && customPeriod.startDate && customPeriod.endDate) {
			return { start: customPeriod.startDate, end: customPeriod.endDate }
		}
		return null
	}

	const now = dayjs()
	let cutoffDate: dayjs.Dayjs

	switch (timePeriod) {
		case '30d':
			cutoffDate = now.subtract(30, 'day')
			break
		case '90d':
			cutoffDate = now.subtract(90, 'day')
			break
		case '365d':
			cutoffDate = now.subtract(365, 'day')
			break
		case 'ytd':
			cutoffDate = now.startOf('year')
			break
		case '3y':
			cutoffDate = now.subtract(3, 'year')
			break
		default:
			return null
	}

	return { start: cutoffDate.unix(), end: Infinity }
}

function filterRowsByTimePeriod(rows: any[], timeField: string, bounds: { start: number; end: number }): any[] {
	return rows.filter((row) => {
		const timestamp = parseRowTimestampSec(row?.[timeField])
		if (timestamp == null) return true
		return timestamp >= bounds.start && timestamp <= bounds.end
	})
}

function filterChartRows(
	config: ChartConfiguration,
	rows: any[],
	timePeriod: TimePeriod,
	customPeriod?: CustomTimePeriod | null
): any[] {
	if (!rows.length) return rows

	const bounds = getTimePeriodBounds(timePeriod, customPeriod)
	if (!bounds || !isTimeSeriesChart(config, rows)) return rows

	return filterRowsByTimePeriod(rows, getTimeField(config), bounds)
}

export function filterLlamaAIChartPayload(
	charts: ChartConfiguration[],
	chartData: any[] | Record<string, any[]>,
	timePeriod: TimePeriod,
	customPeriod?: CustomTimePeriod | null
): any[] | Record<string, any[]> {
	if (Array.isArray(chartData)) {
		const config = charts[0]
		if (!config) return chartData
		return filterChartRows(config, chartData, timePeriod, customPeriod)
	}

	const filtered: Record<string, any[]> = { ...chartData }

	for (const chart of charts) {
		const key = chart.datasetName || chart.id
		const rows = chartData[key]
		if (!Array.isArray(rows)) continue
		filtered[key] = filterChartRows(chart, rows, timePeriod, customPeriod)
	}

	return filtered
}
