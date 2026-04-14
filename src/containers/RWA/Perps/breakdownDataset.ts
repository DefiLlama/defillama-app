import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import type { IRWAPerpsBreakdownChartResponse } from './api.types'

function toUnixMsTimestamp(timestamp: number): number {
	return timestamp > 1e12 ? timestamp : timestamp * 1e3
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

export function getRWAPerpsBreakdownChartSnapshotTotals(rows: IRWAPerpsBreakdownChartResponse | null): {
	latestTotal: number | null
	previousTotal: number | null
} {
	if (!rows || rows.length === 0) return { latestTotal: null, previousTotal: null }

	const normalizedRows = normalizeRWAPerpsBreakdownChartRows(rows)
	const latestRow = normalizedRows[normalizedRows.length - 1]
	const previousRow = normalizedRows.length > 1 ? normalizedRows[normalizedRows.length - 2] : null

	const sumRow = (row: IRWAPerpsBreakdownChartResponse[number] | null) => {
		if (!row) return null
		let total = 0
		for (const key in row) {
			if (key === 'timestamp') continue
			total += row[key]
		}
		return total > 0 ? total : null
	}

	return {
		latestTotal: sumRow(latestRow),
		previousTotal: sumRow(previousRow)
	}
}
