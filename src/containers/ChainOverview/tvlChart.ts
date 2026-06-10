import { TVL_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { getPercentChange, getPrevTvlFromChart } from '~/utils'

export interface ChainTvlChartSummary {
	totalValueUSD: number | null
	tvlPrevDay: number | null
	valueChange24hUSD: number | null
	change24h: number | null
}

type ChainTvlExtraCharts = Record<string, Record<string, number> | undefined>

export function applyChainTvlChartSettings({
	tvlChart,
	extraTvlCharts,
	tvlSettings
}: {
	tvlChart: Array<[number, number]>
	extraTvlCharts: ChainTvlExtraCharts
	tvlSettings: Record<string, boolean>
}): { finalTvlChart: Array<[number, number]>; isGovTokensEnabled: boolean } | null {
	const toggledTvlSettings = TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])

	if (toggledTvlSettings.length === 0) {
		return null
	}

	const toggledTvlSettingsSet = new Set(toggledTvlSettings)
	const store: Record<string, number> = {}
	for (const [date, tvl] of tvlChart) {
		let sum = tvl
		for (const toggledTvlSetting of toggledTvlSettings) {
			sum += extraTvlCharts[toggledTvlSetting]?.[date] ?? 0
		}
		store[date] = sum
	}

	if (toggledTvlSettingsSet.has('liquidstaking') && toggledTvlSettingsSet.has('doublecounted')) {
		for (const date in store) {
			store[date] -= extraTvlCharts['dcAndLsOverlap']?.[date] ?? 0
		}
	}

	const finalTvlChart: Array<[number, number]> = []
	for (const date in store) {
		finalTvlChart.push([+date, store[date]])
	}
	finalTvlChart.sort((a, b) => a[0] - b[0])

	return { finalTvlChart, isGovTokensEnabled: !!tvlSettings.govtokens }
}

export function buildChainTvlChartState({
	tvlChart,
	tvlChartSummary,
	extraTvlCharts,
	tvlSettings,
	nowMs
}: {
	tvlChart: Array<[number, number]>
	tvlChartSummary: ChainTvlChartSummary
	extraTvlCharts: Record<string, Record<string, number>>
	tvlSettings: Record<string, boolean>
	nowMs: number
}): {
	finalTvlChart: Array<[number, number]>
	totalValueUSD: number | null
	valueChange24hUSD: number | null
	change24h: number | null
	isGovTokensEnabled?: boolean
} {
	const chartWithSettings = applyChainTvlChartSettings({ tvlChart, extraTvlCharts, tvlSettings })

	if (!chartWithSettings) {
		return {
			finalTvlChart: tvlChart,
			totalValueUSD: tvlChartSummary.totalValueUSD,
			valueChange24hUSD: tvlChartSummary.valueChange24hUSD,
			change24h: tvlChartSummary.change24h
		}
	}

	const { finalTvlChart, isGovTokensEnabled } = chartWithSettings

	const totalValueUSD = getPrevTvlFromChart(finalTvlChart, 0, nowMs)
	const tvlPrevDay = getPrevTvlFromChart(finalTvlChart, 1, nowMs)
	const valueChange24hUSD = totalValueUSD != null && tvlPrevDay != null ? totalValueUSD - tvlPrevDay : null
	const change24h = totalValueUSD != null && tvlPrevDay != null ? getPercentChange(totalValueUSD, tvlPrevDay) : null

	return { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled }
}
