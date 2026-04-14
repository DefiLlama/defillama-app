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
	const seenSeries = new Set<string>()

	for (const row of source) {
		for (const series in row) {
			if (series !== 'timestamp') {
				seenSeries.add(series)
			}
		}
	}

	return {
		source,
		dimensions: ['timestamp', ...seenSeries]
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
