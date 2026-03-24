import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import type { IRWABreakdownChartResponse } from './api.types'
import { sortKeysByLatestTimestampValue } from './chartAggregation'

export function toBreakdownChartDataset(rows: IRWABreakdownChartResponse | null): MultiSeriesChart2Dataset {
	if (!rows || rows.length === 0) return { source: [], dimensions: ['timestamp'] }

	const source: IRWABreakdownChartResponse = []
	const seenSeries = new Set<string>()

	for (const row of ensureChronologicalRows(rows)) {
		const normalizedRow: IRWABreakdownChartResponse[number] = { timestamp: Number(row.timestamp) }
		let hasData = false

		for (const [series, value] of Object.entries(row)) {
			if (series === 'timestamp') continue

			const numericValue = Number(value)
			if (!Number.isFinite(numericValue)) continue

			hasData = true
			seenSeries.add(series)
			normalizedRow[series] = numericValue
		}

		if (hasData) {
			source.push(normalizedRow)
		}
	}

	if (source.length === 0) return { source: [], dimensions: ['timestamp'] }

	return {
		source,
		dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(source, seenSeries)]
	}
}
