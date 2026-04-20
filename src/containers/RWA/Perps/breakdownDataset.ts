import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import type { IRWAPerpsBreakdownChartResponse } from './api.types'

function toUnixMsTimestamp(timestamp: number): number {
	return timestamp > 1e12 ? timestamp : timestamp * 1e3
}

const DAY_MS = 24 * 60 * 60 * 1000

function getUtcStartOfDay(timestamp: number): number {
	const date = new Date(timestamp)
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function sumChartRow(row: IRWAPerpsBreakdownChartResponse[number] | null): number | null {
	if (!row) return null

	let total = 0
	for (const key in row) {
		if (key === 'timestamp') continue
		total += row[key]
	}

	return total > 0 ? total : null
}

function getLatestRowInWindow(
	rows: IRWAPerpsBreakdownChartResponse,
	windowStart: number,
	windowEnd: number
): IRWAPerpsBreakdownChartResponse[number] | null {
	for (let index = rows.length - 1; index >= 0; index--) {
		const row = rows[index]
		if (row.timestamp >= windowStart && row.timestamp < windowEnd) return row
	}

	return null
}

export function normalizeRWAPerpsBreakdownChartRows(
	rows: IRWAPerpsBreakdownChartResponse | null
): IRWAPerpsBreakdownChartResponse {
	const normalizedRows: IRWAPerpsBreakdownChartResponse = []

	for (const row of rows ?? []) {
		const normalizedRow: IRWAPerpsBreakdownChartResponse[number] = {
			timestamp: toUnixMsTimestamp(Number(row.timestamp))
		}

		for (const key in row) {
			if (key === 'timestamp') continue
			normalizedRow[key] = row[key]
		}

		normalizedRows.push(normalizedRow)
	}

	return ensureChronologicalRows(normalizedRows)
}

export function toRWAPerpsBreakdownChartDataset(
	rows: IRWAPerpsBreakdownChartResponse | null
): MultiSeriesChart2Dataset {
	if (!rows || rows.length === 0) return { source: [], dimensions: ['timestamp'] }

	const source = normalizeRWAPerpsBreakdownChartRows(rows)
	const latestValueBySeries = new Map<string, number>()

	for (let rowIndex = source.length - 1; rowIndex >= 0; rowIndex--) {
		const row = source[rowIndex]
		for (const series in row) {
			if (series === 'timestamp' || latestValueBySeries.has(series)) continue
			const numericValue = Number(row[series])
			latestValueBySeries.set(series, Number.isFinite(numericValue) ? numericValue : 0)
		}
	}

	const sortedSeries = [...latestValueBySeries.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([series]) => series)

	return {
		source,
		dimensions: ['timestamp', ...sortedSeries]
	}
}

export function getRWAPerpsBreakdownChartSnapshotTotals(
	rows: IRWAPerpsBreakdownChartResponse | null,
	currentTimeMs: number = Date.now()
): {
	latestTotal: number | null
	previousTotal: number | null
} {
	if (!rows || rows.length === 0) return { latestTotal: null, previousTotal: null }

	const normalizedRows = normalizeRWAPerpsBreakdownChartRows(rows)
	const todayStart = getUtcStartOfDay(currentTimeMs)
	const yesterdayStart = todayStart - DAY_MS
	const latestRow = getLatestRowInWindow(normalizedRows, todayStart, todayStart + DAY_MS)
	const previousRow = latestRow ? getLatestRowInWindow(normalizedRows, yesterdayStart, todayStart) : null

	return {
		latestTotal: sumChartRow(latestRow),
		previousTotal: sumChartRow(previousRow)
	}
}
