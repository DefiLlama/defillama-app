import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import type { AdaptedChartData, AdaptedLlamaAICartesianChart } from '~/containers/LlamaAI/utils/chartAdapter'

export type ChartViewState = {
	stacked: boolean
	percentage: boolean
	cumulative: boolean
	grouping: 'day' | 'week' | 'month' | 'quarter' | 'year'
	showHallmarks: boolean
	showLabels: boolean
	logScale: boolean
}

export interface ChartCapabilities {
	allowStack: boolean
	allowPercentage: boolean
	allowCumulative: boolean
	allowGrouping: boolean
	allowHallmarks: boolean
	allowLabels: boolean
	allowLogScale: boolean
	// y-axis indices whose series are all strictly positive — log is applied only to these.
	logEligibleYAxes: number[]
	groupingOptions: readonly ChartViewState['grouping'][]
}

export interface ChartControlsModel {
	title?: string
	state: ChartViewState
	showGrouping: boolean
	showStack: boolean
	showPercentage: boolean
	showCumulative: boolean
	showHallmarks: boolean
	showLabels: boolean
	showLogScale: boolean
	groupingOptions: readonly ChartViewState['grouping'][]
}

const GROUPING_OPTIONS: readonly ChartViewState['grouping'][] = ['day', 'week', 'month', 'quarter', 'year']

// A y-axis can render on a log scale only when every plotted value on it is strictly positive.
// Returns the axis indices that qualify; an empty result means the chart can't offer log scale.
function getLogEligibleYAxes(adaptedChart: AdaptedLlamaAICartesianChart): number[] {
	const seriesNamesByAxis = new Map<number, string[]>()
	for (const series of adaptedChart.seriesMeta) {
		const axisIndex = series.yAxisIndex ?? 0
		const names = seriesNamesByAxis.get(axisIndex) ?? []
		names.push(series.name)
		seriesNamesByAxis.set(axisIndex, names)
	}

	const eligible: number[] = []
	for (const [axisIndex, names] of seriesNamesByAxis) {
		let hasNumericValue = false
		let allPositive = true
		for (const row of adaptedChart.props.dataset.source) {
			for (const name of names) {
				const value = row[name]
				if (typeof value !== 'number') continue
				hasNumericValue = true
				if (value <= 0) allPositive = false
			}
		}
		if (hasNumericValue && allPositive) eligible.push(axisIndex)
	}
	return eligible
}

// Scatter log scale needs both axes strictly positive (x and y are the first two tuple slots).
function isScatterLogEligible(adaptedChart: Extract<AdaptedChartData, { chartType: 'scatter' }>): boolean {
	const points = (adaptedChart.props.chartData ?? []) as unknown as Array<Array<number | string | null | undefined>>
	if (points.length === 0) return false
	return points.every(
		(point) => typeof point?.[0] === 'number' && point[0] > 0 && typeof point?.[1] === 'number' && point[1] > 0
	)
}

export function deriveCapabilities(config: ChartConfiguration, adaptedChart: AdaptedChartData): ChartCapabilities {
	switch (adaptedChart.chartType) {
		case 'cartesian': {
			const stackEligibleSeries = adaptedChart.seriesMeta.filter((series) => series.isPrimaryAxis && series.canStack)
			const percentageEligibleSeries = adaptedChart.seriesMeta.filter(
				(series) => series.isPrimaryAxis && series.canPercentage
			)

			const allowGrouping = !!config.displayOptions?.supportsGrouping && adaptedChart.groupingPolicy === 'always'
			const hasCategoryLogos = !!(
				adaptedChart.props &&
				'categoryLogos' in adaptedChart.props &&
				Array.isArray(adaptedChart.props.categoryLogos) &&
				adaptedChart.props.categoryLogos.some(Boolean)
			)
			const logEligibleYAxes = getLogEligibleYAxes(adaptedChart)
			return {
				allowStack: !!config.displayOptions?.canStack && stackEligibleSeries.length > 1,
				allowPercentage: !!config.displayOptions?.canShowPercentage && percentageEligibleSeries.length > 1,
				allowCumulative: !!config.displayOptions?.canShowCumulative && adaptedChart.isTimeChart,
				allowGrouping,
				allowHallmarks: adaptedChart.hasHallmarks,
				allowLabels: hasCategoryLogos,
				allowLogScale: logEligibleYAxes.length > 0,
				logEligibleYAxes,
				groupingOptions: allowGrouping ? GROUPING_OPTIONS : []
			}
		}
		case 'pie':
			return {
				allowStack: false,
				allowPercentage: false,
				allowCumulative: false,
				allowGrouping: false,
				allowHallmarks: false,
				allowLabels: false,
				allowLogScale: false,
				logEligibleYAxes: [],
				groupingOptions: []
			}
		case 'scatter':
			return {
				allowStack: false,
				allowPercentage: false,
				allowCumulative: false,
				allowGrouping: false,
				allowHallmarks: false,
				allowLabels: true,
				allowLogScale: isScatterLogEligible(adaptedChart),
				logEligibleYAxes: [],
				groupingOptions: []
			}
		case 'hbar': {
			const hbarHasLogos = !!(
				adaptedChart.props?.logos &&
				adaptedChart.props.logos.length > 0 &&
				adaptedChart.props.logos.some(Boolean)
			)
			return {
				allowStack: false,
				allowPercentage: false,
				allowCumulative: false,
				allowGrouping: false,
				allowHallmarks: false,
				allowLabels: hbarHasLogos,
				allowLogScale: false,
				logEligibleYAxes: [],
				groupingOptions: []
			}
		}
	}
}

export function normalizeViewState(
	chartState: ChartViewState,
	capabilities: ChartCapabilities,
	_config: ChartConfiguration
): ChartViewState {
	// Normalize backend defaults and user toggles into a state the chart can actually represent.
	// This keeps impossible combinations out of the transformer layer entirely.
	const normalized: ChartViewState = {
		stacked: capabilities.allowStack ? chartState.stacked : false,
		percentage: capabilities.allowPercentage ? chartState.percentage : false,
		cumulative: capabilities.allowCumulative ? chartState.cumulative : false,
		grouping:
			capabilities.allowGrouping && capabilities.groupingOptions.includes(chartState.grouping)
				? chartState.grouping
				: 'day',
		showHallmarks: capabilities.allowHallmarks ? chartState.showHallmarks : false,
		showLabels: capabilities.allowLabels ? chartState.showLabels : false,
		logScale: capabilities.allowLogScale ? chartState.logScale : false
	}

	if (normalized.cumulative) {
		// Cumulative is a dedicated presentation mode, so it disables the multi-series modes.
		normalized.stacked = false
		normalized.percentage = false
	}

	return normalized
}

export function buildControlsModel(
	title: string | undefined,
	state: ChartViewState,
	capabilities: ChartCapabilities
): ChartControlsModel {
	return {
		title,
		state,
		showGrouping: capabilities.allowGrouping,
		showStack: capabilities.allowStack && !state.cumulative,
		showPercentage: capabilities.allowPercentage && !state.cumulative,
		showCumulative: capabilities.allowCumulative,
		showHallmarks: capabilities.allowHallmarks,
		showLabels: capabilities.allowLabels,
		showLogScale: capabilities.allowLogScale,
		groupingOptions: capabilities.groupingOptions
	}
}
