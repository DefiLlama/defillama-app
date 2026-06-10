import { applyChainTvlChartSettings } from '~/containers/ChainOverview/tvlChart'
import type { IChainOverviewData } from '~/containers/ChainOverview/types'

export interface CompareChainsTvlChartState {
	finalTvlChart: Array<[number, number]>
}

export function buildCompareChainsTvlChartState({
	tvlChart,
	tvlSettings,
	extraTvlCharts
}: {
	tvlChart: IChainOverviewData['tvlChart']
	tvlSettings: Record<string, boolean>
	extraTvlCharts: Record<string, Record<string, number> | undefined>
}): CompareChainsTvlChartState {
	const chartWithSettings = applyChainTvlChartSettings({
		tvlChart,
		tvlSettings,
		extraTvlCharts
	})

	if (!chartWithSettings) {
		return { finalTvlChart: tvlChart }
	}

	return { finalTvlChart: chartWithSettings.finalTvlChart }
}
