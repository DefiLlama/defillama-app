import type { RWAChartDataset, RWAChartRow } from '../chartDataset'
import type { IRWAPerpsBreakdownChartResponse } from './api.types'

function toUnixMsTimestamp(timestamp: number): number {
	return timestamp > 1e12 ? timestamp : timestamp * 1e3
}

const DAY_MS = 24 * 60 * 60 * 1000

function getUtcStartOfDay(timestamp: number): number {
	const date = new Date(timestamp)
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function sumChartRow(row: RWAChartRow | null): number | null {
	if (!row) return null

	let total = 0
	for (const key in row) {
		if (key === 'timestamp') continue
		total += row[key] ?? 0
	}

	return total > 0 ? total : null
}

function getLatestRowInWindow(
	rows: RWAChartDataset['source'],
	windowStart: number,
	windowEnd: number
): RWAChartRow | null {
	for (let index = rows.length - 1; index >= 0; index--) {
		const row = rows[index]
		if (row.timestamp >= windowStart && row.timestamp < windowEnd) return row
	}

	return null
}

export function normalizeRWAPerpsBreakdownChartRows(
	rows: IRWAPerpsBreakdownChartResponse | null
): RWAChartDataset['source'] {
	const normalizedRows: RWAChartDataset['source'] = []

	for (const row of rows ?? []) {
		const normalizedRow: RWAChartRow = {
			timestamp: toUnixMsTimestamp(row.timestamp)
		}

		for (const key in row) {
			if (key === 'timestamp') continue
			normalizedRow[key] = row[key]
		}

		normalizedRows.push(normalizedRow)
	}

	return normalizedRows
}

export function toRWAPerpsBreakdownChartDataset(rows: IRWAPerpsBreakdownChartResponse | null): RWAChartDataset {
	if (!rows || rows.length === 0) return { source: [], dimensions: ['timestamp'] }

	const source = normalizeRWAPerpsBreakdownChartRows(rows)
	const latestValueBySeries = new Map<string, number>()

	for (let rowIndex = source.length - 1; rowIndex >= 0; rowIndex--) {
		const row = source[rowIndex]
		for (const series in row) {
			if (series === 'timestamp' || latestValueBySeries.has(series)) continue
			latestValueBySeries.set(series, row[series] ?? 0)
		}
	}

	const sortedSeries = Array.from(latestValueBySeries.entries())
	sortedSeries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
	const dimensions = ['timestamp']
	for (const [series] of sortedSeries) {
		dimensions.push(series)
	}

	return {
		source,
		dimensions
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
