import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { useGetBridgeChartDataByChain } from '~/containers/Bridges/queries.client'
import { useGetStabelcoinsChartDataByChain } from '~/containers/Stablecoins/queries.client'
import {
	FEE_EXTRA_CONFIG_BY_SETTING,
	mergeFeeExtraSeries,
	type FeeExtraConfig,
	type FeeExtraSettings
} from '~/metrics/feeExtras'
import { feeRevenueMetrics } from '~/metrics/feesRevenue'
import { getFeeRevenueChainChartApiParams } from '~/metrics/routeSemantics'
import { fetchJson } from '~/utils/async'
import type { ChainChartLabels } from './constants'
import { buildChainTvlChartState } from './tvlChart'

const normalizeActivityChart = (values: Array<[number, number]> | null): Array<[number, number]> | null =>
	values && values.length > 0
		? values.map(([date, value]): [number, number] => [date * 1e3, +value]).sort((a, b) => a[0] - b[0])
		: null

const buildChainChartApiUrl = (params: Record<string, string | undefined>) => {
	const searchParams = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value != null) {
			searchParams.set(key, value)
		}
	}
	return `/api/public/charts/chain?${searchParams.toString()}`
}

const chainFeesMetric = feeRevenueMetrics.chainFees
const chainRevenueMetric = feeRevenueMetrics.chainRevenue
const appFeesMetric = feeRevenueMetrics.appFees
const appRevenueMetric = feeRevenueMetrics.appRevenue
const EMPTY_FEE_EXTRA_CHART: Array<[number, number]> = []

type CoingeckoChartData = {
	prices: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}

type DenominationPriceHistory = {
	prices: Record<string, number>
	priceChart: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}

export function buildDenominationPriceHistory(data: CoingeckoChartData): DenominationPriceHistory {
	const prices: Record<string, number> = {}
	for (const [date, value] of data.prices) {
		prices[date] = value
	}

	return { prices, priceChart: data.prices, mcaps: data.mcaps, volumes: data.volumes }
}

type BridgedTvlChartPoint = {
	timestamp: number
	data: {
		total: string | number
		ownTokens?: string | number | null
	}
}

export function buildBridgedTvlChart(
	bridgedTvlData: Array<BridgedTvlChartPoint | null>,
	isGovTokensEnabled: boolean | undefined
): Array<[number, number]> {
	const chart: Array<[number, number]> = []
	for (const item of bridgedTvlData) {
		if (!item) continue
		const timestampMs = Math.floor(item.timestamp / 86_400) * 86_400 * 1e3
		chart.push([timestampMs, +item.data.total + (isGovTokensEnabled ? +(item.data.ownTokens ?? 0) : 0)])
	}
	return chart
}

export const useFetchChainChartData = ({
	denomination,
	selectedChain,
	tvlChart,
	tvlChartSummary,
	extraTvlCharts,
	tvlSettings,
	feesSettings,
	chainGeckoId,
	toggledCharts,
	groupBy
}: {
	denomination: string
	selectedChain: string
	tvlChart: Array<[number, number]>
	tvlChartSummary: {
		totalValueUSD: number | null
		tvlPrevDay: number | null
		valueChange24hUSD: number | null
		change24h: number | null
	}
	extraTvlCharts: Record<string, Record<string, number>>
	tvlSettings: Record<string, boolean>
	feesSettings: FeeExtraSettings
	chainGeckoId?: string
	toggledCharts: Array<ChainChartLabels>
	groupBy: ChartTimeGroupingWithCumulative
}) => {
	const toggledChartsSet = useMemo(() => new Set(toggledCharts), [toggledCharts])
	const [nowMs] = useState(() => Date.now())

	const denominationGeckoId =
		denomination !== 'USD' ||
		toggledChartsSet.has('Token Price') ||
		toggledChartsSet.has('Token Mcap') ||
		toggledChartsSet.has('Token Volume')
			? chainGeckoId
			: null

	const isDenominationEnabled = denomination !== 'USD' && !!chainGeckoId
	const isTokenPriceEnabled = toggledChartsSet.has('Token Price')
	const isTokenMcapEnabled = toggledChartsSet.has('Token Mcap')
	const isTokenVolumeEnabled = toggledChartsSet.has('Token Volume')

	// date in the chart is in ms
	const { data: denominationPriceHistory = null, isLoading: fetchingDenominationPriceHistory } = useQuery<{
		prices: Record<string, number>
		priceChart: Array<[number, number]>
		mcaps: Array<[number, number]>
		volumes: Array<[number, number]>
	}>({
		queryKey: ['chain-overview', 'price-history', denominationGeckoId],
		queryFn: () =>
			fetchJson(`/api/public/charts/coingecko/${encodeURIComponent(denominationGeckoId!)}?fullChart=true`).then(
				(res) => {
					if (!res.data?.prices?.length) return null
					return buildDenominationPriceHistory(res.data)
				}
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!denominationGeckoId
	})

	const isChainFeesEnabled = toggledChartsSet.has(chainFeesMetric.label)
	const { data: chainFeesDataChart = null, isLoading: fetchingChainFees } = useQuery<Array<[number, number]>>({
		queryKey: ['chain-overview', chainFeesMetric.chainOverview.queryKey, selectedChain],
		queryFn: () =>
			fetchJson(
				buildChainChartApiUrl(
					getFeeRevenueChainChartApiParams({
						metric: chainFeesMetric,
						chain: selectedChain
					})
				)
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainFeesEnabled
	})

	const isChainRevenueEnabled = toggledChartsSet.has(chainRevenueMetric.label)
	const { data: chainRevenueDataChart = null, isLoading: fetchingChainRevenue } = useQuery<Array<[number, number]>>({
		queryKey: ['chain-overview', chainRevenueMetric.chainOverview.queryKey, selectedChain],
		queryFn: () =>
			fetchJson(
				buildChainChartApiUrl(
					getFeeRevenueChainChartApiParams({
						metric: chainRevenueMetric,
						chain: selectedChain
					})
				)
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainRevenueEnabled
	})

	const isDexVolumeEnabled = toggledChartsSet.has('DEXs Volume')
	const { data: dexVolumeDataChart = null, isLoading: fetchingDexVolume } = useQuery<Array<[number, number]>>({
		queryKey: ['chain-overview', 'dex-volume', selectedChain],
		queryFn: () =>
			fetchJson(buildChainChartApiUrl({ kind: 'adapter-chain', chain: selectedChain, adapterType: 'dexs' })),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isDexVolumeEnabled
	})

	const isPerpsVolumeEnabled = toggledChartsSet.has('Perps Volume')
	const { data: perpsVolumeDataChart = null, isLoading: fetchingPerpVolume } = useQuery<Array<[number, number]>>({
		queryKey: ['chain-overview', 'perp-volume', selectedChain],
		queryFn: () =>
			fetchJson(buildChainChartApiUrl({ kind: 'adapter-chain', chain: selectedChain, adapterType: 'derivatives' })),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isPerpsVolumeEnabled
	})

	const isChainAppFeesEnabled = toggledChartsSet.has(appFeesMetric.label)
	const { data: chainAppFeesDataChart = null, isLoading: fetchingChainAppFees } = useQuery<Array<[number, number]>>({
		queryKey: ['chain-overview', appFeesMetric.chainOverview.queryKey, selectedChain],
		queryFn: () =>
			fetchJson(
				buildChainChartApiUrl(
					getFeeRevenueChainChartApiParams({
						metric: appFeesMetric,
						chain: selectedChain
					})
				)
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainAppFeesEnabled
	})

	const isChainAppRevenueEnabled = toggledChartsSet.has(appRevenueMetric.label)
	const { data: chainAppRevenueDataChart = null, isLoading: fetchingChainAppRevenue } = useQuery<
		Array<[number, number]>
	>({
		queryKey: ['chain-overview', appRevenueMetric.chainOverview.queryKey, selectedChain],
		queryFn: () =>
			fetchJson(
				buildChainChartApiUrl(
					getFeeRevenueChainChartApiParams({
						metric: appRevenueMetric,
						chain: selectedChain
					})
				)
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainAppRevenueEnabled
	})

	const isChainNativeFeeChartEnabled = isChainFeesEnabled || isChainRevenueEnabled
	const isAppFeeChartEnabled = isChainAppFeesEnabled || isChainAppRevenueEnabled
	const chainNativeFeeExtraQueryConfigs = useMemo(() => {
		const buildConfig = (extra: FeeExtraConfig) => ({
			queryKey: ['chain-overview', 'chain-native-fee-extra', extra.dataType, selectedChain],
			queryFn: () =>
				fetchJson<Array<[number, number]>>(
					buildChainChartApiUrl({
						kind: 'adapter-protocol',
						entity: 'chain',
						adapterType: 'fees',
						protocol: selectedChain,
						dataType: extra.dataType
					})
				),
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0,
			enabled: !!feesSettings[extra.setting] && isChainNativeFeeChartEnabled
		})

		return {
			bribes: buildConfig(FEE_EXTRA_CONFIG_BY_SETTING.bribes),
			tokentax: buildConfig(FEE_EXTRA_CONFIG_BY_SETTING.tokentax)
		}
	}, [feesSettings, isChainNativeFeeChartEnabled, selectedChain])
	const appFeeExtraQueryConfigs = useMemo(() => {
		const buildConfig = (extra: FeeExtraConfig) => ({
			queryKey: ['chain-overview', 'app-fee-extra', extra.dataType, selectedChain],
			queryFn: () =>
				fetchJson<Array<[number, number]>>(
					buildChainChartApiUrl({
						kind: 'adapter-chain',
						adapterType: 'fees',
						chain: selectedChain,
						dataType: extra.dataType
					})
				),
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0,
			enabled: !!feesSettings[extra.setting] && isAppFeeChartEnabled
		})

		return {
			bribes: buildConfig(FEE_EXTRA_CONFIG_BY_SETTING.bribes),
			tokentax: buildConfig(FEE_EXTRA_CONFIG_BY_SETTING.tokentax)
		}
	}, [feesSettings, isAppFeeChartEnabled, selectedChain])

	const {
		data: chainNativeBribesDataChart = EMPTY_FEE_EXTRA_CHART,
		isLoading: fetchingChainNativeBribes,
		error: chainNativeBribesError
	} = useQuery<Array<[number, number]>>(chainNativeFeeExtraQueryConfigs.bribes)

	const {
		data: chainNativeTokenTaxDataChart = EMPTY_FEE_EXTRA_CHART,
		isLoading: fetchingChainNativeTokenTax,
		error: chainNativeTokenTaxError
	} = useQuery<Array<[number, number]>>(chainNativeFeeExtraQueryConfigs.tokentax)

	const {
		data: appBribesDataChart = EMPTY_FEE_EXTRA_CHART,
		isLoading: fetchingAppBribes,
		error: appBribesError
	} = useQuery<Array<[number, number]>>(appFeeExtraQueryConfigs.bribes)

	const {
		data: appTokenTaxDataChart = EMPTY_FEE_EXTRA_CHART,
		isLoading: fetchingAppTokenTax,
		error: appTokenTaxError
	} = useQuery<Array<[number, number]>>(appFeeExtraQueryConfigs.tokentax)

	const { data: stablecoinsChartData = null, isLoading: fetchingStablecoinsChartDataByChain } =
		useGetStabelcoinsChartDataByChain(toggledChartsSet.has('Stablecoins Mcap') ? selectedChain : null)

	const { data: inflowsChartData = null, isLoading: fetchingInflowsChartData } = useGetBridgeChartDataByChain(
		toggledChartsSet.has('Net Inflows') ? selectedChain : null
	)

	const isActiveAddressesEnabled = toggledChartsSet.has('Active Addresses')
	const { data: activeAddressesData = null, isLoading: fetchingActiveAddresses } = useQuery<Array<
		[number, number]
	> | null>({
		queryKey: ['chain-overview', 'active-addresses', selectedChain],
		queryFn: () =>
			fetchJson<Array<[number, number]>>(
				buildChainChartApiUrl({
					kind: 'adapter-chain',
					adapterType: 'active-users',
					chain: selectedChain
				})
			)
				.then((values) => normalizeActivityChart(values))
				.catch(() => null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isActiveAddressesEnabled
	})
	const isNewAddressesEnabled = toggledChartsSet.has('New Addresses')
	const { data: newAddressesData = null, isLoading: fetchingNewAddresses } = useQuery<Array<[number, number]> | null>({
		queryKey: ['chain-overview', 'new-addresses', selectedChain],
		queryFn: () =>
			fetchJson<Array<[number, number]>>(
				buildChainChartApiUrl({
					kind: 'adapter-chain',
					adapterType: 'new-users',
					chain: selectedChain
				})
			)
				.then((values) => normalizeActivityChart(values))
				.catch(() => null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isNewAddressesEnabled
	})
	const isTransactionsEnabled = toggledChartsSet.has('Transactions')
	const { data: transactionsData = null, isLoading: fetchingTransactions } = useQuery<Array<[number, number]> | null>({
		queryKey: ['chain-overview', 'transactions', selectedChain],
		queryFn: () =>
			fetchJson<Array<[number, number]>>(
				buildChainChartApiUrl({
					kind: 'adapter-chain',
					adapterType: 'active-users',
					chain: selectedChain,
					dataType: 'dailyTransactionsCount'
				})
			)
				.then((values) => normalizeActivityChart(values))
				.catch(() => null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isTransactionsEnabled
	})
	const isGasUsedEnabled = toggledChartsSet.has('Gas Used')
	const { data: gasUsedData = null, isLoading: fetchingGasUsed } = useQuery<Array<[number, number]> | null>({
		queryKey: ['chain-overview', 'gas-used', selectedChain],
		queryFn: () =>
			fetchJson<Array<[number, number]>>(
				buildChainChartApiUrl({
					kind: 'adapter-chain',
					adapterType: 'active-users',
					chain: selectedChain,
					dataType: 'dailyGasUsed'
				})
			)
				.then((values) => normalizeActivityChart(values))
				.catch(() => null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isGasUsedEnabled
	})

	const isBridgedTvlEnabled = toggledChartsSet.has('Bridged TVL')
	const { data: bridgedTvlData = null, isLoading: fetchingBridgedTvlData } = useQuery({
		queryKey: ['chain-overview', 'bridged-tvl', selectedChain],
		queryFn: isBridgedTvlEnabled
			? () => fetchJson(buildChainChartApiUrl({ kind: 'bridged-tvl', chain: selectedChain }))
			: () => null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isBridgedTvlEnabled
	})

	const isRaisesEnabled = toggledChartsSet.has('Raises')
	const { data: raisesData = null, isLoading: fetchingRaises } = useQuery<Array<[number, number]>>({
		queryKey: ['chain-overview', 'raises'],
		queryFn: () => fetchJson(buildChainChartApiUrl({ kind: 'raises' })),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isRaisesEnabled
	})

	const isChainIncentivesEnabled = toggledChartsSet.has('Token Incentives')
	const { data: chainIncentivesData = null, isLoading: fetchingChainIncentives } = useQuery({
		queryKey: ['chain-overview', 'token-incentives', selectedChain],
		queryFn: () =>
			fetchJson(buildChainChartApiUrl({ kind: 'token-incentives', protocol: selectedChain })).catch(() => null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainIncentivesEnabled
	})

	const { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled } = useMemo(() => {
		return buildChainTvlChartState({ tvlChart, tvlChartSummary, extraTvlCharts, tvlSettings, nowMs })
	}, [tvlChart, tvlChartSummary, extraTvlCharts, tvlSettings, nowMs])

	const enabledChainNativeBribesDataChart = feesSettings.bribes ? chainNativeBribesDataChart : EMPTY_FEE_EXTRA_CHART
	const enabledChainNativeTokenTaxDataChart = feesSettings.tokentax
		? chainNativeTokenTaxDataChart
		: EMPTY_FEE_EXTRA_CHART
	const enabledAppBribesDataChart = feesSettings.bribes ? appBribesDataChart : EMPTY_FEE_EXTRA_CHART
	const enabledAppTokenTaxDataChart = feesSettings.tokentax ? appTokenTaxDataChart : EMPTY_FEE_EXTRA_CHART
	const hasChainNativeFeeExtraError = !!(chainNativeBribesError || chainNativeTokenTaxError)
	const hasAppFeeExtraError = !!(appBribesError || appTokenTaxError)

	const chartData = useMemo(() => {
		const charts: { [key in ChainChartLabels]?: Array<[number, number]> } = {}

		const loadingCharts = []

		if (fetchingDenominationPriceHistory) {
			loadingCharts.push('Denomination Price')
		}

		if (fetchingChainFees) {
			loadingCharts.push(chainFeesMetric.label)
		}

		if (fetchingChainRevenue) {
			loadingCharts.push(chainRevenueMetric.label)
		}

		if (fetchingDexVolume) {
			loadingCharts.push('DEXs Volume')
		}
		if (fetchingPerpVolume) {
			loadingCharts.push('Perps Volume')
		}

		if (fetchingChainAppFees) {
			loadingCharts.push(appFeesMetric.label)
		}

		if (fetchingChainAppRevenue) {
			loadingCharts.push(appRevenueMetric.label)
		}

		if (fetchingChainNativeBribes || fetchingChainNativeTokenTax || fetchingAppBribes || fetchingAppTokenTax) {
			loadingCharts.push('fee extras')
		}

		if (fetchingInflowsChartData) {
			loadingCharts.push('Net Inflows')
		}

		if (fetchingStablecoinsChartDataByChain) {
			loadingCharts.push('Stablecoins Mcap')
		}

		if (fetchingActiveAddresses) {
			loadingCharts.push('Active Addresses')
		}

		if (fetchingNewAddresses) {
			loadingCharts.push('New Addresses')
		}

		if (fetchingTransactions) {
			loadingCharts.push('Transactions')
		}

		if (fetchingGasUsed) {
			loadingCharts.push('Gas Used')
		}

		if (fetchingBridgedTvlData) {
			loadingCharts.push('Bridged TVL')
		}

		if (fetchingRaises) {
			loadingCharts.push('Raises')
		}

		if (fetchingChainIncentives) {
			loadingCharts.push('Token Incentives')
		}

		if (loadingCharts.length > 0) {
			return {
				finalCharts: {} as Record<string, Array<[string | number, number]>>,
				valueSymbol: denomination === 'USD' ? '$' : denomination,
				loadingCharts: loadingCharts.join(', ').toLowerCase(),
				failedMetrics: [] as ChainChartLabels[]
			}
		}

		if (toggledChartsSet.has('TVL')) {
			const chartName: ChainChartLabels = 'TVL' as const
			charts[chartName] = formatLineChart({
				data: finalTvlChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null,
				dateInMs: true
			})
		}

		if (isChainFeesEnabled && chainFeesDataChart) {
			const chartName: ChainChartLabels = chainFeesMetric.label
			const data = mergeFeeExtraSeries({
				base: chainFeesDataChart,
				extraCharts: [enabledChainNativeBribesDataChart, enabledChainNativeTokenTaxDataChart]
			})
			charts[chartName] = formatBarChart({
				data,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (isChainRevenueEnabled && chainRevenueDataChart) {
			const chartName: ChainChartLabels = chainRevenueMetric.label
			const data = mergeFeeExtraSeries({
				base: chainRevenueDataChart,
				extraCharts: [enabledChainNativeBribesDataChart, enabledChainNativeTokenTaxDataChart]
			})
			charts[chartName] = formatBarChart({
				data,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (isDexVolumeEnabled && dexVolumeDataChart) {
			const chartName: ChainChartLabels = 'DEXs Volume' as const
			charts[chartName] = formatBarChart({
				data: dexVolumeDataChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (isPerpsVolumeEnabled && perpsVolumeDataChart) {
			const chartName: ChainChartLabels = 'Perps Volume' as const
			charts[chartName] = formatBarChart({
				data: perpsVolumeDataChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (isChainAppFeesEnabled && chainAppFeesDataChart) {
			const chartName: ChainChartLabels = appFeesMetric.label
			const data = mergeFeeExtraSeries({
				base: chainAppFeesDataChart,
				extraCharts: [enabledAppBribesDataChart, enabledAppTokenTaxDataChart]
			})
			charts[chartName] = formatBarChart({
				data,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (isChainAppRevenueEnabled && chainAppRevenueDataChart) {
			const chartName: ChainChartLabels = appRevenueMetric.label
			const data = mergeFeeExtraSeries({
				base: chainAppRevenueDataChart,
				extraCharts: [enabledAppBribesDataChart, enabledAppTokenTaxDataChart]
			})
			charts[chartName] = formatBarChart({
				data,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (isTokenPriceEnabled && denominationPriceHistory?.priceChart) {
			const chartName: ChainChartLabels = 'Token Price' as const
			charts[chartName] = formatLineChart({
				data: denominationPriceHistory.priceChart,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (isTokenMcapEnabled && denominationPriceHistory?.mcaps) {
			const chartName: ChainChartLabels = 'Token Mcap' as const
			charts[chartName] = formatLineChart({
				data: denominationPriceHistory?.mcaps,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (isTokenVolumeEnabled && denominationPriceHistory?.volumes) {
			const chartName: ChainChartLabels = 'Token Volume' as const
			charts[chartName] = formatBarChart({
				data: denominationPriceHistory?.volumes,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (toggledChartsSet.has('Net Inflows') && inflowsChartData) {
			const chartName: ChainChartLabels = 'Net Inflows' as const
			charts[chartName] = formatBarChart({
				data: inflowsChartData,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (toggledChartsSet.has('Stablecoins Mcap') && stablecoinsChartData) {
			const chartName: ChainChartLabels = 'Stablecoins Mcap' as const
			charts[chartName] = formatLineChart({
				data: stablecoinsChartData,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null,
				dateInMs: true
			})
		}

		if (isActiveAddressesEnabled && activeAddressesData) {
			const chartName: ChainChartLabels = 'Active Addresses' as const
			charts[chartName] = formatBarChart({
				data: activeAddressesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (isNewAddressesEnabled && newAddressesData) {
			const chartName: ChainChartLabels = 'New Addresses' as const
			charts[chartName] = formatBarChart({
				data: newAddressesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (isTransactionsEnabled && transactionsData) {
			const chartName: ChainChartLabels = 'Transactions' as const
			charts[chartName] = formatBarChart({
				data: transactionsData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (isGasUsedEnabled && gasUsedData) {
			const chartName: ChainChartLabels = 'Gas Used' as const
			charts[chartName] = formatBarChart({
				data: gasUsedData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (isBridgedTvlEnabled && bridgedTvlData) {
			const chartName: ChainChartLabels = 'Bridged TVL' as const
			charts[chartName] = formatLineChart({
				data: buildBridgedTvlChart(bridgedTvlData, isGovTokensEnabled),
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null,
				dateInMs: true
			})
		}

		if (isRaisesEnabled && raisesData) {
			const chartName: ChainChartLabels = 'Raises' as const
			charts[chartName] = formatBarChart({
				data: raisesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (isChainIncentivesEnabled && chainIncentivesData) {
			const chartName: ChainChartLabels = 'Token Incentives' as const
			charts[chartName] = formatLineChart({
				data: chainIncentivesData,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		const failedMetrics = toggledCharts.filter((chartLabel) => {
			const isTokenMetric = chartLabel === 'Token Price' || chartLabel === 'Token Mcap' || chartLabel === 'Token Volume'
			// Token metrics are intentionally not fetched when no chain gecko id is available.
			if (isTokenMetric && !denominationGeckoId) return false
			return !Object.prototype.hasOwnProperty.call(charts, chartLabel)
		})
		if (hasChainNativeFeeExtraError) {
			if (isChainFeesEnabled && !failedMetrics.includes(chainFeesMetric.label)) {
				failedMetrics.push(chainFeesMetric.label)
			}
			if (isChainRevenueEnabled && !failedMetrics.includes(chainRevenueMetric.label)) {
				failedMetrics.push(chainRevenueMetric.label)
			}
		}
		if (hasAppFeeExtraError) {
			if (isChainAppFeesEnabled && !failedMetrics.includes(appFeesMetric.label)) {
				failedMetrics.push(appFeesMetric.label)
			}
			if (isChainAppRevenueEnabled && !failedMetrics.includes(appRevenueMetric.label)) {
				failedMetrics.push(appRevenueMetric.label)
			}
		}

		return {
			finalCharts: charts,
			valueSymbol: denomination === 'USD' ? '$' : denomination,
			loadingCharts: '',
			failedMetrics
		}
	}, [
		toggledChartsSet,
		isGovTokensEnabled,
		fetchingDenominationPriceHistory,
		isDenominationEnabled,
		denominationPriceHistory,
		fetchingChainFees,
		isChainFeesEnabled,
		chainFeesDataChart,
		fetchingChainRevenue,
		isChainRevenueEnabled,
		chainRevenueDataChart,
		fetchingDexVolume,
		isDexVolumeEnabled,
		dexVolumeDataChart,
		fetchingPerpVolume,
		isPerpsVolumeEnabled,
		perpsVolumeDataChart,
		fetchingChainAppFees,
		isChainAppFeesEnabled,
		chainAppFeesDataChart,
		fetchingChainAppRevenue,
		isChainAppRevenueEnabled,
		chainAppRevenueDataChart,
		fetchingChainNativeBribes,
		fetchingChainNativeTokenTax,
		fetchingAppBribes,
		fetchingAppTokenTax,
		hasChainNativeFeeExtraError,
		hasAppFeeExtraError,
		enabledChainNativeBribesDataChart,
		enabledChainNativeTokenTaxDataChart,
		enabledAppBribesDataChart,
		enabledAppTokenTaxDataChart,
		isTokenPriceEnabled,
		isTokenMcapEnabled,
		isTokenVolumeEnabled,
		fetchingInflowsChartData,
		inflowsChartData,
		fetchingStablecoinsChartDataByChain,
		stablecoinsChartData,
		fetchingActiveAddresses,
		isActiveAddressesEnabled,
		activeAddressesData,
		fetchingNewAddresses,
		isNewAddressesEnabled,
		newAddressesData,
		fetchingTransactions,
		isTransactionsEnabled,
		transactionsData,
		fetchingGasUsed,
		isGasUsedEnabled,
		gasUsedData,
		fetchingBridgedTvlData,
		isBridgedTvlEnabled,
		bridgedTvlData,
		fetchingRaises,
		isRaisesEnabled,
		raisesData,
		fetchingChainIncentives,
		isChainIncentivesEnabled,
		chainIncentivesData,
		finalTvlChart,
		denominationGeckoId,
		denomination,
		groupBy,
		toggledCharts
	])

	return {
		isFetchingChartData: !!chartData.loadingCharts,
		finalCharts: chartData.finalCharts,
		valueSymbol: chartData.valueSymbol,
		failedMetrics: chartData.failedMetrics,
		totalValueUSD,
		valueChange24hUSD,
		change24h
	}
}

// todo dev metrics, commits charts
