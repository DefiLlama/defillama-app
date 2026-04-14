import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { toUnixMsTimestamp } from './api'
import type { IRWABreakdownChartResponse } from './api.types'

export function toBreakdownChartDataset(rows: IRWABreakdownChartResponse | null): MultiSeriesChart2Dataset {
	if (!rows || rows.length === 0) return { source: [], dimensions: ['timestamp'] }

	const seenSeries = new Set<string>()
	const source: IRWABreakdownChartResponse = []

	for (const row of rows) {
		const normalizedRow: IRWABreakdownChartResponse[number] = { timestamp: toUnixMsTimestamp(Number(row.timestamp)) }

		for (const series in row) {
			if (series === 'timestamp') continue
			seenSeries.add(series)
			normalizedRow[series] = row[series]
		}

		source.push(normalizedRow)
	}

	return {
		source: ensureChronologicalRows(source),
		dimensions: ['timestamp', ...seenSeries]
	}
}
