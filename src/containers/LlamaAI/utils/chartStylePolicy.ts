import type { AdaptedChartData } from '~/containers/LlamaAI/utils/chartAdapter'
import type { ChartViewState } from '~/containers/LlamaAI/utils/chartCapabilities'

export interface ChartStylePolicy {
	solidAreaFill: boolean
}

export function resolveStylePolicy(adaptedChart: AdaptedChartData, state: ChartViewState): ChartStylePolicy {
	if (adaptedChart.chartType !== 'cartesian') {
		return { solidAreaFill: false }
	}

	const lineSeriesCount = adaptedChart.props.charts?.filter((series) => series.type === 'line').length ?? 0
	return {
		solidAreaFill: state.stacked && lineSeriesCount > 1
	}
}
