import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import type { IProtocolTaxonomyPageData } from './types'

type ProtocolTaxonomyCharts = IProtocolTaxonomyPageData['charts']

function getNumericChartValue(value: string | number | null | undefined): number | null {
	if (value == null) return null
	const numericValue = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numericValue) ? numericValue : null
}

export function buildProtocolTaxonomyGroupedCharts({
	charts,
	groupBy
}: {
	charts: ProtocolTaxonomyCharts
	groupBy: ChartTimeGroupingWithCumulative
}): ProtocolTaxonomyCharts {
	const chartSeries = charts.charts ?? []
	const dataByDimension = new Map<string, Array<[number, number]>>()
	const barDimensions = new Set<string>()
	const dimensionOrder: string[] = []

	for (const series of chartSeries) {
		const yDimension = typeof series.encode.y === 'string' ? series.encode.y : null
		if (!yDimension) continue

		dimensionOrder.push(yDimension)
		if (!dataByDimension.has(yDimension)) {
			dataByDimension.set(yDimension, [])
		}
		if (series.type === 'bar') {
			barDimensions.add(yDimension)
		}
	}

	if (barDimensions.size === 0) return charts

	let hasBarCharts = false
	for (const row of charts.dataset.source) {
		const timestamp = getNumericChartValue(row.timestamp)
		for (const [dimension, rawData] of dataByDimension) {
			const value = getNumericChartValue(row[dimension])
			if (value == null) continue
			if (barDimensions.has(dimension)) hasBarCharts = true
			if (timestamp != null) rawData.push([timestamp, value])
		}
	}

	if (!hasBarCharts) return charts

	const rowsByTimestamp = new Map<number, Record<string, number | null>>()
	const groupedSeries: ProtocolTaxonomyCharts['charts'] = []

	for (const series of chartSeries) {
		const yDimension = typeof series.encode.y === 'string' ? series.encode.y : null

		if (!yDimension) {
			groupedSeries.push(series)
			continue
		}

		const groupedData =
			series.type === 'bar'
				? formatBarChart({
						data: dataByDimension.get(yDimension) ?? [],
						groupBy,
						dateInMs: true,
						denominationPriceHistory: null
					})
				: formatLineChart({
						data: dataByDimension.get(yDimension) ?? [],
						groupBy,
						dateInMs: true,
						denominationPriceHistory: null
					})

		for (const [timestamp, value] of groupedData) {
			const row = rowsByTimestamp.get(timestamp) ?? { timestamp }
			row[yDimension] = value
			rowsByTimestamp.set(timestamp, row)
		}

		groupedSeries.push({
			...series,
			type: series.type === 'bar' && groupBy === 'cumulative' ? 'line' : series.type
		})
	}

	const source = Array.from(rowsByTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp)
	for (const row of source) {
		for (const dimension of dimensionOrder) {
			if (!(dimension in row)) row[dimension] = null
		}
	}

	return {
		...charts,
		dataset: {
			source,
			dimensions: ['timestamp', ...dimensionOrder]
		},
		charts: groupedSeries
	}
}
