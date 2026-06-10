import { applyChainTvlChartSettings } from '~/containers/ChainOverview/tvlChart'
import type { IChainOverviewData } from '~/containers/ChainOverview/types'
import { getPercentChange, getPrevTvlFromChart } from '~/utils'

export interface CompareChainsTvlChartState {
	finalTvlChart: Array<[number, number]>
	totalValueUSD: number | null
	valueChange24hUSD: number | null
	change24h: number | null
	isGovTokensEnabled?: boolean
}

export function buildCompareChainsTvlChartState({
	tvlChart,
	tvlSettings,
	extraTvlCharts,
	nowMs
}: {
	tvlChart: IChainOverviewData['tvlChart']
	tvlSettings: Record<string, boolean>
	extraTvlCharts: IChainOverviewData['extraTvlCharts']
	nowMs: number
}): CompareChainsTvlChartState {
	const chartWithSettings = applyChainTvlChartSettings({
		tvlChart,
		tvlSettings,
		extraTvlCharts: extraTvlCharts as Record<string, Record<string, number> | undefined>
	})

	if (!chartWithSettings) {
		const totalValueUSD = getPrevTvlFromChart(tvlChart, 0, nowMs)
		const tvlPrevDay = getPrevTvlFromChart(tvlChart, 1, nowMs)
		const valueChange24hUSD = totalValueUSD != null && tvlPrevDay != null ? totalValueUSD - tvlPrevDay : null
		const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
		return { finalTvlChart: tvlChart, totalValueUSD, valueChange24hUSD, change24h }
	}

	const { finalTvlChart, isGovTokensEnabled } = chartWithSettings

	const totalValueUSD = getPrevTvlFromChart(finalTvlChart, 0, nowMs)
	const tvlPrevDay = getPrevTvlFromChart(finalTvlChart, 1, nowMs)
	const valueChange24hUSD = totalValueUSD != null && tvlPrevDay != null ? totalValueUSD - tvlPrevDay : null
	const change24h = getPercentChange(totalValueUSD, tvlPrevDay)

	return { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled }
}
