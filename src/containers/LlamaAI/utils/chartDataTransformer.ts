import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import type { AdaptedLlamaAICartesianChart, LlamaAICartesianDatasetRow } from '~/containers/LlamaAI/utils/chartAdapter'
import type { AdaptedChartData } from '~/containers/LlamaAI/utils/chartAdapter'
import type { ChartCapabilities, ChartViewState } from '~/containers/LlamaAI/utils/chartCapabilities'

type GroupingInterval = 'day' | 'week' | 'month' | 'quarter'

const GROUP_BY_LABEL: Record<GroupingInterval, AdaptedLlamaAICartesianChart['props']['groupBy']> = {
	day: 'daily',
	week: 'weekly',
	month: 'monthly',
	quarter: 'quarterly'
}

function cloneChartOptions(chartOptions: AdaptedLlamaAICartesianChart['props']['chartOptions']) {
	if (!chartOptions) return undefined

	const deepCloneValue = <T>(value: T): T => {
		if (Array.isArray(value)) {
			return value.map((item) => deepCloneValue(item)) as T
		}

		if (value && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value).map(([key, nestedValue]) => [key, deepCloneValue(nestedValue)])
			) as T
		}

		return value
	}

	return deepCloneValue(chartOptions)
}

function cloneCartesianChart(chart: AdaptedLlamaAICartesianChart): AdaptedLlamaAICartesianChart {
	return {
		...chart,
		props: {
			...chart.props,
			dataset: {
				source: chart.props.dataset.source.map((row) => ({ ...row })),
				dimensions: [...chart.props.dataset.dimensions]
			},
			charts: chart.props.charts?.map((series) => ({ ...series })) ?? [],
			chartOptions: cloneChartOptions(chart.props.chartOptions),
			hallmarks: chart.props.hallmarks ? [...chart.props.hallmarks] : undefined
		},
		seriesMeta: chart.seriesMeta.map((series) => ({ ...series }))
	}
}

function isTimeChart(chart: AdaptedLlamaAICartesianChart) {
	return chart.axisType === 'time' && chart.props.dataset.dimensions[0] === 'timestamp'
}

function bucketTimestamp(timestampMs: number, interval: Exclude<GroupingInterval, 'day'>) {
	const date = new Date(timestampMs)
	if (interval === 'week') {
		const day = date.getUTCDay()
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day)
	}
	if (interval === 'month') {
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
	}
	const quarter = Math.floor(date.getUTCMonth() / 3)
	return Date.UTC(date.getUTCFullYear(), quarter * 3, 1)
}

function aggregateSeriesValues(values: number[], metricClass: 'flow' | 'stock') {
	if (values.length === 0) return undefined
	if (metricClass === 'flow') return values.reduce((sum, value) => sum + value, 0)
	return values.reduce((sum, value) => sum + value, 0) / values.length
}

function createRowWithSeriesValues(
	timestamp: number,
	groupedValues: Map<string, number[]>,
	seriesMeta: AdaptedLlamaAICartesianChart['seriesMeta']
) {
	const row: LlamaAICartesianDatasetRow = { timestamp }
	for (const meta of seriesMeta) {
		const values = groupedValues.get(meta.name) ?? []
		const aggregated = aggregateSeriesValues(values, meta.metricClass)
		if (aggregated !== undefined) {
			row[meta.name] = aggregated
		}
	}
	return row
}

function createRowsFromFormattedSeries(
	seriesData: Array<{
		name: string
		data: Array<[number, number | null]>
	}>
) {
	// Rebuild the canonical dataset row model after formatter utilities return per-series tuples.
	const rowsByTimestamp = new Map<number, LlamaAICartesianDatasetRow>()

	for (const series of seriesData) {
		for (const [timestamp, value] of series.data) {
			if (!rowsByTimestamp.has(timestamp)) {
				rowsByTimestamp.set(timestamp, { timestamp })
			}
			rowsByTimestamp.get(timestamp)![series.name] = value
		}
	}

	return Array.from(rowsByTimestamp.values()).sort((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0))
}

export class ChartDataTransformer {
	static applyViewState(
		adaptedChart: AdaptedChartData,
		state: ChartViewState,
		capabilities: ChartCapabilities
	): AdaptedChartData {
		// Always transform from the immutable adapted chart. This avoids state toggles
		// compounding on top of prior transformed output and drifting over time.
		if (adaptedChart.chartType === 'pie') return adaptedChart

		if (adaptedChart.chartType !== 'cartesian') {
			return adaptedChart
		}

		let transformedChart = cloneCartesianChart(adaptedChart)

		// Apply view-state transforms in display order so each step sees canonical input.
		if (state.grouping !== 'day' && capabilities.allowGrouping) {
			transformedChart = this.groupByInterval(transformedChart, state.grouping)
		}

		if (state.cumulative && capabilities.allowCumulative) {
			transformedChart = this.applyCumulativeToSeries(transformedChart)
		}

		if (state.percentage && capabilities.allowPercentage) {
			transformedChart = this.toPercentage(transformedChart, state.stacked)
		} else if (state.stacked && capabilities.allowStack) {
			transformedChart = this.toStacked(transformedChart)
		}

		const hasSecondaryAxis = transformedChart.seriesMeta.some((series) => (series.yAxisIndex ?? 0) > 0)
		const percentageChartOptions: Record<string, any> | undefined =
			state.percentage && capabilities.allowPercentage
				? {
						grid: {
							top: 24,
							right: 12,
							bottom: 68,
							left: 12
						},
						...(!hasSecondaryAxis
							? {
									yAxis: {
										max: 100,
										min: 0,
										axisLabel: {
											formatter: '{value}%'
										}
									}
								}
							: {})
					}
				: undefined

		return {
			...transformedChart,
			props: {
				...transformedChart.props,
				valueSymbol: state.percentage && capabilities.allowPercentage ? '%' : adaptedChart.props.valueSymbol,
				hallmarks: state.showHallmarks ? transformedChart.props.hallmarks : undefined,
				chartOptions: percentageChartOptions
					? { ...transformedChart.props.chartOptions, ...percentageChartOptions }
					: transformedChart.props.chartOptions
			}
		}
	}

	static groupByInterval(
		chart: AdaptedLlamaAICartesianChart,
		interval: GroupingInterval
	): AdaptedLlamaAICartesianChart {
		const nextChart = cloneCartesianChart(chart)
		nextChart.props.groupBy = GROUP_BY_LABEL[interval]

		if (!isTimeChart(nextChart) || interval === 'day') {
			return nextChart
		}

		if (interval === 'week' || interval === 'month') {
			const groupBy = interval === 'week' ? 'weekly' : 'monthly'
			const formattedSeries = nextChart.seriesMeta.map((meta) => {
				const data = nextChart.props.dataset.source.flatMap((row) => {
					const timestamp = Number(row.timestamp)
					const value = row[meta.name]
					if (!Number.isFinite(timestamp) || typeof value !== 'number' || Number.isNaN(value)) return []
					return [[timestamp, value] as [number, number]]
				})

				return {
					name: meta.name,
					data:
						// Aggregation semantics follow the data model, not the chart primitive.
						// Flow metrics sum across the bucket; stock metrics keep the bucket snapshot.
						meta.metricClass === 'flow'
							? formatBarChart({ data, groupBy, dateInMs: true, denominationPriceHistory: null })
							: formatLineChart({ data, groupBy, dateInMs: true, denominationPriceHistory: null })
				}
			})

			nextChart.props.dataset.source = createRowsFromFormattedSeries(formattedSeries)
			nextChart.rowCount = nextChart.props.dataset.source.length
			return nextChart
		}

		const groupedRows = new Map<number, Map<string, number[]>>()

		for (const row of nextChart.props.dataset.source) {
			const timestamp = Number(row.timestamp)
			if (!Number.isFinite(timestamp)) continue
			const bucket = bucketTimestamp(timestamp, interval)
			if (!groupedRows.has(bucket)) {
				groupedRows.set(bucket, new Map())
			}

			const groupedValues = groupedRows.get(bucket)!
			for (const meta of nextChart.seriesMeta) {
				const rawValue = row[meta.name]
				if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) continue
				const values = groupedValues.get(meta.name) ?? []
				values.push(rawValue)
				groupedValues.set(meta.name, values)
			}
		}

		nextChart.props.dataset.source = Array.from(groupedRows.entries())
			.map(([timestamp, groupedValues]) => createRowWithSeriesValues(timestamp, groupedValues, nextChart.seriesMeta))
			.sort((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0))

		nextChart.rowCount = nextChart.props.dataset.source.length
		return nextChart
	}

	static applyCumulativeToSeries(chart: AdaptedLlamaAICartesianChart): AdaptedLlamaAICartesianChart {
		const nextChart = cloneCartesianChart(chart)
		if (!isTimeChart(nextChart)) return nextChart
		const seriesCount = nextChart.seriesMeta.length

		const formattedSeries = nextChart.seriesMeta.map((meta) => {
			const data = nextChart.props.dataset.source.flatMap((row) => {
				const timestamp = Number(row.timestamp)
				if (!Number.isFinite(timestamp)) return []
				const rawValue = row[meta.name]
				const numericValue = typeof rawValue === 'number' && !Number.isNaN(rawValue) ? rawValue : 0
				return [[timestamp, numericValue] as [number, number]]
			})

			return {
				name: meta.name,
				data: formatBarChart({
					data,
					groupBy: 'cumulative',
					dateInMs: true,
					denominationPriceHistory: null
				})
			}
		})

		nextChart.props.dataset.source = createRowsFromFormattedSeries(formattedSeries)
		nextChart.props.charts =
			nextChart.props.charts?.map((series) => {
				const meta = nextChart.seriesMeta.find((item) => item.name === series.name)
				const { hideAreaStyle: _hideAreaStyle, stack: _stack, ...rest } = series
				return {
					...rest,
					type: 'line' as const,
					// Single-series cumulative charts can use the default gradient area fill.
					// For multi-series cumulative charts, keep plain lines to avoid overlapping filled areas.
					...(meta?.baseType === 'bar' && seriesCount > 1 ? { hideAreaStyle: true } : {})
				}
			}) ?? []

		nextChart.rowCount = nextChart.props.dataset.source.length
		return nextChart
	}

	static toStacked(chart: AdaptedLlamaAICartesianChart): AdaptedLlamaAICartesianChart {
		const nextChart = cloneCartesianChart(chart)
		nextChart.props.charts =
			nextChart.props.charts?.map((series) => {
				const isPrimaryAxis = (series.yAxisIndex ?? 0) === 0
				if (!isPrimaryAxis) {
					const { stack: _stack, ...rest } = series
					return rest
				}
				return { ...series, stack: 'total' }
			}) ?? []
		return nextChart
	}

	static toPercentage(chart: AdaptedLlamaAICartesianChart, shouldStack: boolean = true): AdaptedLlamaAICartesianChart {
		const nextChart = cloneCartesianChart(chart)
		const primarySeries = nextChart.seriesMeta.filter((series) => (series.yAxisIndex ?? 0) === 0)
		if (primarySeries.length === 0) return nextChart

		const primarySeriesNames = new Set(primarySeries.map((series) => series.name))

		nextChart.props.dataset.source = nextChart.props.dataset.source.map((row) => {
			const nextRow = { ...row }
			const total = primarySeries.reduce((sum, series) => {
				const value = nextRow[series.name]
				return sum + (typeof value === 'number' && !Number.isNaN(value) ? value : 0)
			}, 0)

			for (const series of primarySeries) {
				const value = nextRow[series.name]
				const numericValue = typeof value === 'number' && !Number.isNaN(value) ? value : 0
				nextRow[series.name] = total > 0 ? (numericValue / total) * 100 : 0
			}

			return nextRow
		})

		nextChart.props.charts =
			nextChart.props.charts?.map((series) => {
				if (!primarySeriesNames.has(series.name)) return series

				const { hideAreaStyle: _hideAreaStyle, stack: _stack, ...rest } = series
				return {
					...rest,
					type: 'line' as const,
					valueSymbol: '%',
					...(shouldStack ? { stack: 'total' } : { hideAreaStyle: true })
				}
			}) ?? []

		nextChart.props.valueSymbol = '%'
		return nextChart
	}
}
