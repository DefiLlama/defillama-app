import { toUnixMsTimestamp } from './api'
import type { IRWABreakdownChartResponse, RWAOverviewBreakdownRequest, RWAChartMetricKey } from './api.types'
import { getRwaChartTotalLabel, isRwaTotalSeriesLabel } from './chartAggregation'
import { buildRwaChartDatasetTotal, type RWAChartDataset, type RWAChartRow } from './chartDataset'

export function toBreakdownChartDataset(rows: IRWABreakdownChartResponse | null): RWAChartDataset {
	if (!rows || rows.length === 0) return { source: [], dimensions: ['timestamp'] }

	const seenSeries = new Set<string>()
	const source: RWAChartDataset['source'] = []

	for (const row of rows) {
		const normalizedRow: RWAChartRow = {
			timestamp: toUnixMsTimestamp(row.timestamp)
		}

		for (const series in row) {
			if (series === 'timestamp') continue
			seenSeries.add(series)
			normalizedRow[series] = row[series]
		}

		source.push(normalizedRow)
	}

	const dimensions = ['timestamp']
	for (const series of seenSeries) {
		dimensions.push(series)
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
	dataset: RWAChartDataset,
	chartType: RWAChartMetricKey
): RWAChartDataset {
	const totalLabel = getRwaChartTotalLabel(chartType)
	if (dataset.dimensions.includes(totalLabel)) return dataset

	return buildRwaChartDatasetTotal({
		dataset,
		totalLabel,
		isSeriesDimension: (dimension) =>
			dimension !== 'timestamp' && dimension !== 'Total' && !isRwaTotalSeriesLabel(dimension)
	})
}

export function toOverviewBreakdownChartDataset(
	rows: IRWABreakdownChartResponse | null,
	request: RWAOverviewBreakdownRequest
): RWAChartDataset {
	const dataset = toBreakdownChartDataset(rows)
	return shouldAppendOverviewBreakdownTotalSeries(request.breakdown)
		? appendOverviewBreakdownTotalSeries(dataset, request.key)
		: dataset
}
