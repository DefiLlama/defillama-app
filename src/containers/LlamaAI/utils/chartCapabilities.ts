import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import type { AdaptedChartData } from '~/containers/LlamaAI/utils/chartAdapter'

export type ChartViewState = {
	stacked: boolean
	percentage: boolean
	cumulative: boolean
	grouping: 'day' | 'week' | 'month' | 'quarter' | 'year'
	showHallmarks: boolean
	showLabels: boolean
}

export interface ChartCapabilities {
	allowStack: boolean
	allowPercentage: boolean
	allowCumulative: boolean
	allowGrouping: boolean
	allowHallmarks: boolean
	allowLabels: boolean
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
	groupingOptions: readonly ChartViewState['grouping'][]
}

const GROUPING_OPTIONS: readonly ChartViewState['grouping'][] = ['day', 'week', 'month', 'quarter', 'year']

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
			return {
				allowStack: !!config.displayOptions?.canStack && stackEligibleSeries.length > 1,
				allowPercentage: !!config.displayOptions?.canShowPercentage && percentageEligibleSeries.length > 1,
				allowCumulative: !!config.displayOptions?.canShowCumulative && adaptedChart.isTimeChart,
				allowGrouping,
				allowHallmarks: adaptedChart.hasHallmarks,
				allowLabels: hasCategoryLogos,
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
		showLabels: capabilities.allowLabels ? chartState.showLabels : false
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
		groupingOptions: capabilities.groupingOptions
	}
}
