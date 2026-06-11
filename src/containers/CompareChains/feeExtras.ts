import {
	getEnabledFeeExtraConfigs,
	mergeFeeExtraSeries,
	type FeeExtraMetric,
	type FeeExtraSettings
} from '~/metrics/feeExtras'

type Chart = Array<[number, number]>

export type CompareChainsFeeChartInput = {
	chain: string
	chainFeesChart: Chart | null
	chainRevenueChart: Chart | null
}

export type CompareChainsFeeExtraChartsByChain = Record<string, Partial<Record<FeeExtraMetric, Chart>>>

export type CompareChainsFeeExtraFetchConfig = {
	chain: string
	dataType: FeeExtraMetric
	label: string
	queryKey: ['compare-chains', 'chain-native-fee-extra', FeeExtraMetric, string]
	url: string
}

const FEE_CHART_KEYS = new Set(['chainFeesChart', 'chainRevenueChart'])

const buildCompareChainsFeeExtraChartUrl = ({ chain, dataType }: { chain: string; dataType: FeeExtraMetric }) => {
	const searchParams = new URLSearchParams({
		kind: 'adapter-protocol',
		entity: 'chain',
		adapterType: 'fees',
		protocol: chain,
		dataType
	})

	return `/api/public/charts/chain?${searchParams.toString()}`
}

export function hasSelectedCompareChainsFeeChart(selectedCharts: string[]) {
	for (const chart of selectedCharts) {
		if (FEE_CHART_KEYS.has(chart)) return true
	}
	return false
}

const hasBaseFeeChartForSelectedChart = (chainData: CompareChainsFeeChartInput, selectedCharts: string[]) => {
	if (selectedCharts.includes('chainFeesChart') && chainData.chainFeesChart?.length) return true
	if (selectedCharts.includes('chainRevenueChart') && chainData.chainRevenueChart?.length) return true
	return false
}

export function buildCompareChainsFeeExtraFetchConfigs({
	chainData,
	selectedCharts,
	feesSettings
}: {
	chainData: CompareChainsFeeChartInput[]
	selectedCharts: string[]
	feesSettings: FeeExtraSettings
}): CompareChainsFeeExtraFetchConfig[] {
	if (!hasSelectedCompareChainsFeeChart(selectedCharts)) return []

	const configs: CompareChainsFeeExtraFetchConfig[] = []
	const enabledExtras = getEnabledFeeExtraConfigs(feesSettings)
	for (const data of chainData) {
		if (!hasBaseFeeChartForSelectedChart(data, selectedCharts)) continue
		for (const extra of enabledExtras) {
			configs.push({
				chain: data.chain,
				dataType: extra.dataType,
				label: extra.label,
				queryKey: ['compare-chains', 'chain-native-fee-extra', extra.dataType, data.chain],
				url: buildCompareChainsFeeExtraChartUrl({ chain: data.chain, dataType: extra.dataType })
			})
		}
	}
	return configs
}

const mergeOptionalFeeChart = (base: Chart | null, extraCharts: Chart[]): Chart | null => {
	if (!base?.length) return base
	if (extraCharts.every((chart) => chart.length === 0)) return base
	return mergeFeeExtraSeries({ base, extraCharts })
}

export function applyCompareChainsFeeExtras<T extends CompareChainsFeeChartInput>({
	chainData,
	selectedCharts,
	feesSettings,
	feeExtraCharts
}: {
	chainData: T
	selectedCharts: string[]
	feesSettings: FeeExtraSettings
	feeExtraCharts: Partial<Record<FeeExtraMetric, Chart>> | null | undefined
}): T {
	if (!hasSelectedCompareChainsFeeChart(selectedCharts)) return chainData

	const extraCharts: Chart[] = []
	for (const extra of getEnabledFeeExtraConfigs(feesSettings)) {
		extraCharts.push(feeExtraCharts?.[extra.dataType] ?? [])
	}
	if (extraCharts.length === 0) return chainData

	const next = { ...chainData }
	if (selectedCharts.includes('chainFeesChart')) {
		next.chainFeesChart = mergeOptionalFeeChart(chainData.chainFeesChart, extraCharts)
	}
	if (selectedCharts.includes('chainRevenueChart')) {
		next.chainRevenueChart = mergeOptionalFeeChart(chainData.chainRevenueChart, extraCharts)
	}
	return next
}

export function getCompareChainsFeeExtraFailedMetrics({
	configs,
	results
}: {
	configs: CompareChainsFeeExtraFetchConfig[]
	results: Array<{ error?: unknown }>
}) {
	const failedMetrics: string[] = []
	for (let index = 0; index < configs.length; index++) {
		if (results[index]?.error) {
			failedMetrics.push(`${configs[index].chain} - ${configs[index].label}`)
		}
	}
	return failedMetrics
}
