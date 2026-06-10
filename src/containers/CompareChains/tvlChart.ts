import type { IChainOverviewData } from '~/containers/ChainOverview/types'
import { TVL_SETTINGS_KEYS } from '~/contexts/LocalStorage'
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
	extraTvlCharts
}: {
	tvlChart: IChainOverviewData['tvlChart']
	tvlSettings: Record<string, boolean>
	extraTvlCharts: IChainOverviewData['extraTvlCharts']
}): CompareChainsTvlChartState {
	const toggledTvlSettings = TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])

	if (toggledTvlSettings.length === 0) {
		const totalValueUSD = getPrevTvlFromChart(tvlChart, 0)
		const tvlPrevDay = getPrevTvlFromChart(tvlChart, 1)
		const valueChange24hUSD = totalValueUSD != null && tvlPrevDay != null ? totalValueUSD - tvlPrevDay : null
		const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
		return { finalTvlChart: tvlChart, totalValueUSD, valueChange24hUSD, change24h }
	}

	const toggledTvlSettingsSet = new Set(toggledTvlSettings)
	const extraCharts = extraTvlCharts as Record<string, Record<string, number> | undefined>
	const store: Record<string, number> = {}
	for (const [date, tvl] of tvlChart) {
		let sum = tvl
		for (const toggledTvlSetting of toggledTvlSettings) {
			sum += extraCharts[toggledTvlSetting]?.[date] ?? 0
		}
		store[date] = sum
	}

	const dates: string[] = []
	for (const date in store) {
		dates.push(date)
	}
	if (toggledTvlSettingsSet.has('liquidstaking') && toggledTvlSettingsSet.has('doublecounted')) {
		for (const date of dates) {
			store[date] -= extraTvlCharts['dcAndLsOverlap']?.[date] ?? 0
		}
	}

	const finalTvlChart: Array<[number, number]> = []
	dates.sort((a, b) => Number(a) - Number(b))
	for (const date of dates) {
		finalTvlChart.push([+date, store[date]])
	}

	const totalValueUSD = getPrevTvlFromChart(finalTvlChart, 0)
	const tvlPrevDay = getPrevTvlFromChart(finalTvlChart, 1)
	const valueChange24hUSD = totalValueUSD != null && tvlPrevDay != null ? totalValueUSD - tvlPrevDay : null
	const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
	const isGovTokensEnabled = !!tvlSettings?.govtokens

	return { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled }
}
