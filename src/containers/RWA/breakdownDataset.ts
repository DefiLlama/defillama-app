import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { toUnixMsTimestamp } from './api'
import type { IRWABreakdownChartResponse, RWAOverviewBreakdownRequest, RWAChartMetricKey } from './api.types'
import { getRwaChartTotalLabel, isRwaTotalSeriesLabel } from './chartAggregation'

export function toBreakdownChartDataset(rows: IRWABreakdownChartResponse | null): MultiSeriesChart2Dataset {
	if (!rows || rows.length === 0) return { source: [], dimensions: ['timestamp'] }

	const seenSeries = new Set<string>()
	const source: MultiSeriesChart2Dataset['source'] = []

	for (const row of rows) {
		const normalizedRow: MultiSeriesChart2Dataset['source'][number] = {
			timestamp: toUnixMsTimestamp(Number(row.timestamp))
		}

		for (const series in row) {
			if (series === 'timestamp') continue
			seenSeries.add(series)
			normalizedRow[series] = row[series]
		}

		source.push(normalizedRow)
	}

	const startedSeries = new Set<string>()

	for (const row of source) {
		for (const series in row) {
			if (series === 'timestamp') continue
			const value = row[series]
			if (value == null) continue
			const numericValue = typeof value === 'number' ? value : Number(value)
			if (numericValue !== 0) {
				startedSeries.add(series)
				continue
			}
			if (!startedSeries.has(series)) {
				row[series] = null
			}
		}
	}

	const dimensions = ['timestamp']
	for (const series of seenSeries) {
		if (startedSeries.has(series)) dimensions.push(series)
	}

	return {
		source,
		dimensions
	}
}

export function shouldAppendOverviewBreakdownTotalSeries(breakdown: RWAOverviewBreakdownRequest['breakdown']): boolean {
	return breakdown === 'chain' || breakdown === 'platform' || breakdown === 'assetGroup'
}

export function appendOverviewBreakdownTotalSeries(
	dataset: MultiSeriesChart2Dataset,
	chartType: RWAChartMetricKey
): MultiSeriesChart2Dataset {
	const totalLabel = getRwaChartTotalLabel(chartType)
	if (dataset.dimensions.includes(totalLabel)) return dataset

	const seriesDimensions = dataset.dimensions.filter(
		(dimension) => dimension !== 'timestamp' && dimension !== 'Total' && !isRwaTotalSeriesLabel(dimension)
	)
	if (dataset.source.length === 0 || seriesDimensions.length === 0) return dataset

	return {
		source: dataset.source.map((row) => {
			let total = 0
			for (const dimension of seriesDimensions) {
				const value = row[dimension]
				const numericValue = typeof value === 'number' ? value : Number(value)
				if (Number.isFinite(numericValue)) total += numericValue
			}

			return {
				...row,
				[totalLabel]: total
			}
		}),
		dimensions: ['timestamp', totalLabel, ...seriesDimensions]
	}
}

export function toOverviewBreakdownChartDataset(
	rows: IRWABreakdownChartResponse | null,
	request: RWAOverviewBreakdownRequest
): MultiSeriesChart2Dataset {
	const dataset = toBreakdownChartDataset(rows)
	return shouldAppendOverviewBreakdownTotalSeries(request.breakdown)
		? appendOverviewBreakdownTotalSeries(dataset, request.key)
		: dataset
}
