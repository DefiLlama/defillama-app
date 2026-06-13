import { useQueries, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import type { DenominationPriceHistory } from '~/api/coingecko.types'
import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { useFetchProtocolGovernanceData } from '~/containers/Governance/queries.client'
import {
	useFetchProtocolActivityChart,
	useFetchProtocolMedianAPY,
	useFetchProtocolTVLChart
} from '~/containers/ProtocolOverview/queries.client'
import type { EmissionsChartRow } from '~/containers/Unlocks/api.types'
import { FEE_EXTRA_CONFIG_BY_SETTING, type FeeExtraConfig } from '~/metrics/feeExtras'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { ADAPTER_CHART_DESCRIPTORS, type AdapterChartDescriptorLabel } from './chartDescriptors'
import { getGroupedTimestampSec, normalizeSeriesToMilliseconds, normalizeSeriesToSeconds } from './chartSeries.utils'
import { oracleProtocols, protocolCharts, type ProtocolChartsLabels } from './constants'
import { buildProtocolFeeFamilyCharts } from './protocolFeeCharts'
import {
	buildExtraTvlCharts,
	buildTvlChart,
	buildUsdInflowsFromTvlChart,
	getProtocolExtraTvlChartFetchState
} from './tvlChart'
import type { IProtocolOverviewPageData, IToggledMetrics } from './types'
import {
	getPrefetchedProtocolChartQueryOptions,
	usePrefetchedProtocolChartQuery
} from './usePrefetchedProtocolChartQuery'

type ChartInterval = ChartTimeGroupingWithCumulative
type AdapterChartState = { data: Array<[number, number]> | null; isLoading: boolean; enabled: boolean }
type NonFeeAdapterChartDescriptorLabel = Exclude<AdapterChartDescriptorLabel, 'Fees' | 'Revenue' | 'Holders Revenue'>

const buildChartRowsFromTimestampRecord = (
	valuesByTimestamp: Record<string, number>,
	timestampMultiplier = 1
): Array<[number, number]> => {
	const rows: Array<[number, number]> = []
	for (const timestamp in valuesByTimestamp) {
		rows.push([+timestamp * timestampMultiplier, valuesByTimestamp[timestamp]])
	}
	return rows
}

const buildProtocolChartApiUrl = (params: Record<string, string | undefined>) => {
	const searchParams = new URLSearchParams()
	for (const key in params) {
		const value = params[key]
		if (value != null) {
			searchParams.set(key, value)
		}
	}
	return `/api/public/charts/protocol?${searchParams.toString()}`
}

export const useFetchProtocolChartData = ({
	name,
	id: protocolId,
	geckoId,
	currentTvlByChain,
	initialMultiSeriesChartData,
	metrics,
	toggledMetrics,
	groupBy,
	availableCharts,
	chartDenominations,
	governanceApis,
	tvlSettings,
	feesSettings,
	isCEX
}: IProtocolOverviewPageData & {
	toggledMetrics: IToggledMetrics
	groupBy: ChartInterval
	tvlSettings: Record<string, boolean>
	feesSettings: Record<string, boolean>
}) => {
	const router = useRouter()
	const isRouterReady = router.isReady
	const protocolSlug = slug(name)
	const chartDenominationBySymbol = useMemo(
		() => new Map(chartDenominations.map((d) => [d.symbol, d])),
		[chartDenominations]
	)
	const selectedDenomination = toggledMetrics.denomination
		? chartDenominationBySymbol.get(toggledMetrics.denomination)
		: null
	const hasAnyToggledChart = availableCharts.some((chartLabel) => toggledMetrics[protocolCharts[chartLabel]] === 'true')
	const oracleProtocolName = (oracleProtocols as Record<string, string>)[name] ?? name
	const prefetchedChartsInSeconds = useMemo(() => {
		const normalized: Partial<Record<ProtocolChartsLabels, Array<[number, number]>>> = {}
		for (const chartLabel in initialMultiSeriesChartData) {
			const typedLabel = chartLabel as ProtocolChartsLabels
			const series = initialMultiSeriesChartData[typedLabel]
			if (!series?.length) continue
			normalized[typedLabel] = normalizeSeriesToSeconds(series)
		}
		return normalized
	}, [initialMultiSeriesChartData])
	const prefetchedChartsForMsRender = useMemo(() => {
		const normalized: Partial<Record<ProtocolChartsLabels, Array<[number, number]>>> = { ...prefetchedChartsInSeconds }
		const treasurySeries = prefetchedChartsInSeconds['Treasury']
		if (treasurySeries?.length) {
			normalized['Treasury'] = normalizeSeriesToMilliseconds(treasurySeries)
		}
		const bridgeVolumeSeries = prefetchedChartsInSeconds['Bridge Volume']
		if (bridgeVolumeSeries?.length) {
			normalized['Bridge Volume'] = normalizeSeriesToMilliseconds(bridgeVolumeSeries)
		}
		return normalized
	}, [prefetchedChartsInSeconds])

	const denominationGeckoId = isRouterReady && hasAnyToggledChart ? (selectedDenomination?.geckoId ?? null) : null
	const { data: denominationPriceHistory = null, isLoading: fetchingDenominationPriceHistory } = useQuery<Record<
		string,
		number
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'denomination-price-history', denominationGeckoId],
		queryFn: () =>
			fetchJson(`/api/public/charts/coingecko/${encodeURIComponent(denominationGeckoId!)}?fullChart=true`).then(
				(res: { data?: { prices?: Array<[number, number]> } }) => {
					if (!res.data?.prices?.length) return null
					const store: Record<string, number> = {}
					for (const [date, value] of res.data.prices) {
						store[String(date)] = value
						store[String(Math.floor(date / 1e3))] = value
					}
					return store
				}
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!denominationGeckoId
	})

	const { data: protocolTokenData = null, isLoading: fetchingProtocolTokenData } =
		useQuery<DenominationPriceHistory | null>({
			queryKey: ['protocol-overview', protocolSlug, 'token-price-history', geckoId],
			queryFn: () =>
				fetchJson(`/api/public/charts/coingecko/${encodeURIComponent(geckoId!)}?fullChart=true`).then(
					(res: { data?: DenominationPriceHistory }) => (res.data?.prices?.length ? res.data : null)
				),
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0,
			enabled: !!(
				isRouterReady &&
				(toggledMetrics.mcap === 'true' ||
					toggledMetrics.tokenPrice === 'true' ||
					toggledMetrics.tokenVolume === 'true' ||
					toggledMetrics.fdv === 'true') &&
				geckoId
			)
		})

	const { data: tokenTotalSupply = null, isLoading: fetchingTokenTotalSupply } = useQuery<number | null>({
		queryKey: ['protocol-overview', protocolSlug, 'token-supply', geckoId],
		queryFn: () =>
			fetchJson<{ totalSupply: number | null }>(
				`/api/public/charts/coingecko/${encodeURIComponent(geckoId!)}?kind=supply`
			).then((res) => {
				const totalSupply = res.totalSupply
				return typeof totalSupply === 'number' && Number.isFinite(totalSupply) ? totalSupply : null
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!(geckoId && toggledMetrics.fdv === 'true' && isRouterReady)
	})
	const { data: tokenLiquidityData = null, isLoading: fetchingTokenLiquidity } = useQuery<Array<
		[string | number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'token-liquidity', protocolId],
		queryFn: () => fetchJson(buildProtocolChartApiUrl({ kind: 'token-liquidity', protocolId })),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!(isRouterReady && metrics.liquidity && toggledMetrics.tokenLiquidity === 'true')
	})

	const isTvlToggled = toggledMetrics.tvl === 'true'
	const isTotalAssetsToggled = toggledMetrics.totalAssets === 'true'
	const isTvsToggled = toggledMetrics.tvs === 'true'
	const isMcapToggled = toggledMetrics.mcap === 'true'
	const isTokenPriceToggled = toggledMetrics.tokenPrice === 'true'
	const isTokenVolumeToggled = toggledMetrics.tokenVolume === 'true'
	const isFdvToggled = toggledMetrics.fdv === 'true'
	const isUnlocksToggled = toggledMetrics.unlocks === 'true'
	const isIncentivesToggled = toggledMetrics.incentives === 'true'
	const isStakingTvlToggled = toggledMetrics.staking_tvl === 'true'
	const isBorrowedTvlToggled = toggledMetrics.borrowed_tvl === 'true'
	const isNftVolumeToggled = toggledMetrics.nftVolume === 'true'
	const isActiveAddressesToggled = toggledMetrics.activeAddresses === 'true'
	const isNewAddressesToggled = toggledMetrics.newAddresses === 'true'
	const isTransactionsToggled = toggledMetrics.transactions === 'true'
	const isGasUsedToggled = toggledMetrics.gasUsed === 'true'
	const isTreasuryToggled = toggledMetrics.treasury === 'true'
	const isUsdInflowsToggled = toggledMetrics.usdInflows === 'true'
	const isBridgeVolumeToggled = toggledMetrics.bridgeVolume === 'true'
	const primaryTvlChartLabel: ProtocolChartsLabels = isCEX ? 'Total Assets' : 'TVL'
	const isPrimaryTvlToggled = isCEX ? isTotalAssetsToggled : isTvlToggled
	const needsCompositeTvlChart = isPrimaryTvlToggled || isUsdInflowsToggled

	const {
		pool2: shouldFetchPool2Tvl,
		staking: shouldFetchStakingTvl,
		borrowed: shouldFetchBorrowedTvl,
		doublecounted: shouldFetchDoubleCountedTvl,
		liquidstaking: shouldFetchLiquidStakingTvl,
		vesting: shouldFetchVestingTvl,
		govtokens: shouldFetchGovTokensTvl
	} = getProtocolExtraTvlChartFetchState({
		isRouterReady,
		currentTvlByChain,
		tvlSettings,
		needsCompositeTvlChart,
		isStakingTvlToggled,
		isBorrowedTvlToggled
	})
	const baseTvlChartData = useMemo((): Array<[number, number]> => {
		if (isCEX) {
			return prefetchedChartsInSeconds['Total Assets'] ?? prefetchedChartsInSeconds['TVL'] ?? []
		}
		return prefetchedChartsInSeconds['TVL'] ?? []
	}, [prefetchedChartsInSeconds, isCEX])
	const shouldFetchBaseTvlChart = !!(
		isRouterReady &&
		metrics.tvl &&
		needsCompositeTvlChart &&
		baseTvlChartData.length === 0 &&
		availableCharts.includes(primaryTvlChartLabel)
	)
	const { data: fetchedBaseTvlChart = null, isLoading: fetchingBaseTvlChart } = useFetchProtocolTVLChart({
		protocol: protocolSlug,
		enabled: shouldFetchBaseTvlChart
	})
	const resolvedBaseTvlChartData = useMemo(
		(): Array<[number, number]> =>
			baseTvlChartData.length > 0
				? baseTvlChartData
				: fetchedBaseTvlChart
					? normalizeSeriesToSeconds(fetchedBaseTvlChart)
					: [],
		[baseTvlChartData, fetchedBaseTvlChart]
	)

	const { data: pool2TvlChart = null, isLoading: fetchingPool2TvlChart } = useFetchProtocolTVLChart({
		protocol: protocolSlug,
		key: 'pool2',
		enabled: shouldFetchPool2Tvl
	})
	const { data: stakingTvlChart = null, isLoading: fetchingStakingTvlChart } = useFetchProtocolTVLChart({
		protocol: protocolSlug,
		key: 'staking',
		enabled: shouldFetchStakingTvl
	})
	const { data: borrowedTvlChart = null, isLoading: fetchingBorrowedTvlChart } = useFetchProtocolTVLChart({
		protocol: protocolSlug,
		key: 'borrowed',
		enabled: shouldFetchBorrowedTvl
	})
	const { data: doubleCountedTvlChart = null, isLoading: fetchingDoubleCountedTvlChart } = useFetchProtocolTVLChart({
		protocol: protocolSlug,
		key: 'doublecounted',
		enabled: shouldFetchDoubleCountedTvl
	})
	const { data: liquidStakingTvlChart = null, isLoading: fetchingLiquidStakingTvlChart } = useFetchProtocolTVLChart({
		protocol: protocolSlug,
		key: 'liquidstaking',
		enabled: shouldFetchLiquidStakingTvl
	})
	const { data: vestingTvlChart = null, isLoading: fetchingVestingTvlChart } = useFetchProtocolTVLChart({
		protocol: protocolSlug,
		key: 'vesting',
		enabled: shouldFetchVestingTvl
	})
	const { data: govTokensTvlChart = null, isLoading: fetchingGovTokensTvlChart } = useFetchProtocolTVLChart({
		protocol: protocolSlug,
		key: 'govtokens',
		enabled: shouldFetchGovTokensTvl
	})

	const extraTvlCharts = useMemo(
		() =>
			buildExtraTvlCharts({
				pool2: pool2TvlChart,
				staking: stakingTvlChart,
				borrowed: borrowedTvlChart,
				doublecounted: doubleCountedTvlChart,
				liquidstaking: liquidStakingTvlChart,
				vesting: vestingTvlChart,
				govtokens: govTokensTvlChart
			}),
		[
			pool2TvlChart,
			stakingTvlChart,
			borrowedTvlChart,
			doubleCountedTvlChart,
			liquidStakingTvlChart,
			vestingTvlChart,
			govTokensTvlChart
		]
	)

	const tvlChart = useMemo(
		() =>
			buildTvlChart({
				tvlChartData: resolvedBaseTvlChartData,
				extraTvlCharts,
				tvlSettings,
				currentTvlByChain,
				groupBy,
				denominationPriceHistory
			}),
		[resolvedBaseTvlChartData, extraTvlCharts, tvlSettings, groupBy, denominationPriceHistory, currentTvlByChain]
	)

	const adapterChartConfigs = useMemo(() => {
		const configs: Array<{
			descriptor: (typeof ADAPTER_CHART_DESCRIPTORS)[number]
			enabled: boolean
			prefetchedData: Array<[number, number]> | null
			queryOptions: ReturnType<typeof getPrefetchedProtocolChartQueryOptions>['queryOptions']
		}> = []

		for (const descriptor of ADAPTER_CHART_DESCRIPTORS) {
			let hasMetric = false
			for (const metricKey of descriptor.metricKeys) {
				if (metrics[metricKey]) {
					hasMetric = true
					break
				}
			}

			const queryParamKey = protocolCharts[descriptor.label]
			const enabled = !!(toggledMetrics[queryParamKey] === 'true' && hasMetric && isRouterReady)
			const { prefetchedData, queryOptions } = getPrefetchedProtocolChartQueryOptions({
				label: descriptor.label,
				queryKey: ['protocol-overview', protocolSlug, descriptor.clientQueryKey],
				enabled,
				prefetchedCharts: prefetchedChartsInSeconds,
				queryFn: () =>
					fetchJson<Array<[number, number]> | null>(
						buildProtocolChartApiUrl({
							kind: 'adapter',
							adapterType: descriptor.chartRequest.adapterType,
							protocol: name,
							dataType: 'dataType' in descriptor.chartRequest ? descriptor.chartRequest.dataType : undefined
						})
					)
			})
			configs.push({
				descriptor,
				enabled,
				prefetchedData,
				queryOptions
			})
		}

		return configs
	}, [metrics, toggledMetrics, isRouterReady, protocolSlug, name, prefetchedChartsInSeconds])

	const adapterChartQueryResults = useQueries({
		queries: adapterChartConfigs.map(({ queryOptions }) => queryOptions)
	})

	const adapterChartStates = {} as Record<AdapterChartDescriptorLabel, AdapterChartState>
	for (let i = 0; i < adapterChartConfigs.length; i++) {
		const { descriptor, enabled, prefetchedData } = adapterChartConfigs[i]
		const result = adapterChartQueryResults[i]
		adapterChartStates[descriptor.label] = {
			data: (result.data as Array<[number, number]> | null | undefined) ?? prefetchedData,
			isLoading: result.isLoading,
			enabled
		}
	}

	const feesChartState = adapterChartStates.Fees
	const revenueChartState = adapterChartStates.Revenue
	const holdersRevenueChartState = adapterChartStates['Holders Revenue']

	const isFeesEnabled = feesChartState.enabled
	const feesDataChart = feesChartState.data
	const fetchingFees = feesChartState.isLoading

	const isRevenueEnabled = revenueChartState.enabled
	const revenueDataChart = revenueChartState.data
	const fetchingRevenue = revenueChartState.isLoading

	const isHoldersRevenueEnabled = holdersRevenueChartState.enabled
	const holdersRevenueDataChart = holdersRevenueChartState.data
	const fetchingHoldersRevenue = holdersRevenueChartState.isLoading

	const isFeeFamilyChartEnabled =
		toggledMetrics.fees === 'true' || toggledMetrics.revenue === 'true' || toggledMetrics.holdersRevenue === 'true'
	const feeExtraQueryConfigs = useMemo(() => {
		const buildConfig = (extra: FeeExtraConfig) => {
			const enabled = !!(
				isFeeFamilyChartEnabled &&
				feesSettings?.[extra.setting] &&
				metrics[extra.protocolMetricField] &&
				isRouterReady
			)

			return {
				queryKey: ['protocol-overview', protocolSlug, extra.clientQueryKey],
				queryFn: () =>
					fetchJson<Array<[number, number]> | null>(
						buildProtocolChartApiUrl({
							kind: 'adapter',
							adapterType: 'fees',
							dataType: extra.dataType,
							protocol: name
						})
					),
				staleTime: 60 * 60 * 1000,
				refetchOnWindowFocus: false,
				retry: 0,
				enabled
			}
		}

		return {
			bribes: buildConfig(FEE_EXTRA_CONFIG_BY_SETTING.bribes),
			tokentax: buildConfig(FEE_EXTRA_CONFIG_BY_SETTING.tokentax)
		}
	}, [isFeeFamilyChartEnabled, feesSettings, metrics, isRouterReady, protocolSlug, name])
	const isBribesEnabled = feeExtraQueryConfigs.bribes.enabled
	const {
		data: bribesDataChart = null,
		isLoading: fetchingBribes,
		error: bribesChartError
	} = useQuery<Array<[number, number]> | null>(feeExtraQueryConfigs.bribes)

	const isTokenTaxesEnabled = feeExtraQueryConfigs.tokentax.enabled
	const {
		data: tokenTaxesDataChart = null,
		isLoading: fetchingTokenTaxes,
		error: tokenTaxesChartError
	} = useQuery<Array<[number, number]> | null>(feeExtraQueryConfigs.tokentax)
	const enabledBribesDataChart = isBribesEnabled ? bribesDataChart : null
	const enabledTokenTaxesDataChart = isTokenTaxesEnabled ? tokenTaxesDataChart : null
	const enabledBribesChartError = isBribesEnabled ? bribesChartError : null
	const enabledTokenTaxesChartError = isTokenTaxesEnabled ? tokenTaxesChartError : null

	const dexVolumeChartState = adapterChartStates['DEX Volume']
	const dexNotionalVolumeChartState = adapterChartStates['DEX Notional Volume']
	const perpsVolumeChartState = adapterChartStates['Perp Volume']
	const openInterestChartState = adapterChartStates['Open Interest']
	const optionsPremiumVolumeChartState = adapterChartStates['Options Premium Volume']
	const optionsNotionalVolumeChartState = adapterChartStates['Options Notional Volume']
	const dexAggregatorsVolumeChartState = adapterChartStates['DEX Aggregator Volume']
	const perpsAggregatorsVolumeChartState = adapterChartStates['Perp Aggregator Volume']
	const bridgeAggregatorsVolumeChartState = adapterChartStates['Bridge Aggregator Volume']

	const isDexVolumeEnabled = dexVolumeChartState.enabled
	const dexVolumeDataChart = dexVolumeChartState.data
	const fetchingDexVolume = dexVolumeChartState.isLoading

	const isDexNotionalVolumeEnabled = dexNotionalVolumeChartState.enabled
	const dexNotionalVolumeDataChart = dexNotionalVolumeChartState.data
	const fetchingDexNotionalVolume = dexNotionalVolumeChartState.isLoading

	const isPerpsVolumeEnabled = perpsVolumeChartState.enabled
	const perpsVolumeDataChart = perpsVolumeChartState.data
	const fetchingPerpVolume = perpsVolumeChartState.isLoading

	const isOpenInterestEnabled = openInterestChartState.enabled
	const openInterestDataChart = openInterestChartState.data
	const fetchingOpenInterest = openInterestChartState.isLoading

	const isOptionsPremiumVolumeEnabled = optionsPremiumVolumeChartState.enabled
	const optionsPremiumVolumeDataChart = optionsPremiumVolumeChartState.data
	const fetchingOptionsPremiumVolume = optionsPremiumVolumeChartState.isLoading

	const isOptionsNotionalVolumeEnabled = optionsNotionalVolumeChartState.enabled
	const optionsNotionalVolumeDataChart = optionsNotionalVolumeChartState.data
	const fetchingOptionsNotionalVolume = optionsNotionalVolumeChartState.isLoading

	const isDexAggregatorsVolumeEnabled = dexAggregatorsVolumeChartState.enabled
	const dexAggregatorsVolumeDataChart = dexAggregatorsVolumeChartState.data
	const fetchingDexAggregatorVolume = dexAggregatorsVolumeChartState.isLoading

	const isPerpsAggregatorsVolumeEnabled = perpsAggregatorsVolumeChartState.enabled
	const perpsAggregatorsVolumeDataChart = perpsAggregatorsVolumeChartState.data
	const fetchingPerpAggregatorVolume = perpsAggregatorsVolumeChartState.isLoading

	const isBridgeAggregatorsVolumeEnabled = bridgeAggregatorsVolumeChartState.enabled
	const bridgeAggregatorsVolumeDataChart = bridgeAggregatorsVolumeChartState.data
	const fetchingBridgeAggregatorVolume = bridgeAggregatorsVolumeChartState.isLoading

	const isUnlocksEnabled = !!(
		(toggledMetrics.unlocks === 'true' || toggledMetrics.incentives === 'true') &&
		(metrics.unlocks || metrics.incentives) &&
		isRouterReady
	)
	const { data: unlocksAndIncentivesData = null, isLoading: fetchingUnlocksAndIncentives } = useQuery<{
		chartData: { documented: Array<EmissionsChartRow>; realtime: Array<EmissionsChartRow> }
		unlockUsdChart: Array<[string | number, number]> | null
	} | null>({
		queryKey: ['protocol-overview', protocolSlug, 'unlocks'],
		queryFn: () =>
			isUnlocksEnabled
				? fetchJson(buildProtocolChartApiUrl({ kind: 'unlocks', protocol: name }))
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isUnlocksEnabled
	})

	const isTreasuryEnabled = !!(toggledMetrics.treasury === 'true' && metrics.treasury && isRouterReady)
	const { data: treasuryData, isLoading: fetchingTreasury } = usePrefetchedProtocolChartQuery({
		label: 'Treasury',
		prefetchedCharts: prefetchedChartsForMsRender,
		queryKey: ['protocol-overview', protocolSlug, 'treasury'],
		enabled: isTreasuryEnabled,
		queryFn: () =>
			fetchJson<Array<[number, number]> | null>(
				buildProtocolChartApiUrl({ kind: 'treasury', protocol: protocolSlug })
			).then((chart) => (chart ? normalizeSeriesToMilliseconds(chart) : null))
	})

	const isUsdInflowsEnabled = !!(toggledMetrics.usdInflows === 'true' && metrics.tvl && isRouterReady)
	const usdInflowsData = useMemo(() => {
		if (!isUsdInflowsEnabled) return null

		const tvlChartInUsd = buildTvlChart({
			tvlChartData: resolvedBaseTvlChartData,
			extraTvlCharts,
			tvlSettings,
			currentTvlByChain,
			groupBy: 'daily',
			denominationPriceHistory: null
		})
		return buildUsdInflowsFromTvlChart(tvlChartInUsd)
	}, [isUsdInflowsEnabled, resolvedBaseTvlChartData, extraTvlCharts, tvlSettings, currentTvlByChain])
	const fetchingUsdInflows = false

	const isBridgeVolumeEnabled = !!(toggledMetrics.bridgeVolume === 'true' && isRouterReady)
	const { data: bridgeVolumeData, isLoading: fetchingBridgeVolume } = usePrefetchedProtocolChartQuery({
		label: 'Bridge Volume',
		prefetchedCharts: prefetchedChartsForMsRender,
		queryKey: ['protocol-overview', protocolSlug, 'bridge-volume'],
		enabled: isBridgeVolumeEnabled,
		queryFn: () =>
			fetchJson<Array<[number, number]> | null>(buildProtocolChartApiUrl({ kind: 'bridge-volume', protocol: name }))
	})

	const isTvsEnabled = !!(toggledMetrics.tvs === 'true' && isRouterReady && availableCharts.includes('TVS'))
	const { data: tvsData, isLoading: fetchingTvs } = usePrefetchedProtocolChartQuery({
		label: 'TVS',
		prefetchedCharts: prefetchedChartsInSeconds,
		queryKey: ['protocol-overview', protocolSlug, 'tvs'],
		enabled: isTvsEnabled,
		queryFn: () =>
			fetchJson<Array<[number, number]> | null>(
				buildProtocolChartApiUrl({ kind: 'oracle-chart', protocol: oracleProtocolName })
			)
				.then((chart) => (chart ? normalizeSeriesToSeconds(chart) : null))
				.catch(() => null)
	})

	const { data: medianAPYData = null, isLoading: fetchingMedianAPY } = useFetchProtocolMedianAPY(
		isRouterReady && toggledMetrics.medianApy === 'true' && metrics.yields && !protocolId.startsWith('parent#')
			? slug(name)
			: null
	)

	const { data: activeAddressesData = null, isLoading: fetchingActiveAddresses } = useFetchProtocolActivityChart({
		queryKey: 'active-users',
		protocol: isRouterReady && toggledMetrics.activeAddresses === 'true' && metrics.activeUsers ? name : null,
		adapterType: 'active-users'
	})
	const { data: newAddressesData = null, isLoading: fetchingNewAddresses } = useFetchProtocolActivityChart({
		queryKey: 'new-users',
		protocol: isRouterReady && toggledMetrics.newAddresses === 'true' && metrics.newUsers ? name : null,
		adapterType: 'new-users'
	})
	const { data: transactionsData = null, isLoading: fetchingTransactions } = useFetchProtocolActivityChart({
		queryKey: 'transactions',
		protocol: isRouterReady && toggledMetrics.transactions === 'true' && metrics.txCount ? name : null,
		adapterType: 'active-users',
		dataType: 'dailyTransactionsCount'
	})
	const { data: gasUsedData = null, isLoading: fetchingGasUsed } = useFetchProtocolActivityChart({
		queryKey: 'gas-used',
		protocol: isRouterReady && toggledMetrics.gasUsed === 'true' && metrics.gasUsed ? name : null,
		adapterType: 'active-users',
		dataType: 'dailyGasUsed'
	})

	const isGovernanceEnabled = !!(
		isRouterReady &&
		[toggledMetrics.totalProposals, toggledMetrics.successfulProposals, toggledMetrics.maxVotes].some(
			(v) => v === 'true'
		) &&
		governanceApis &&
		governanceApis.length > 0
	)
	const { data: governanceData = null, isLoading: fetchingGovernanceData } = useFetchProtocolGovernanceData(
		isGovernanceEnabled ? governanceApis : null
	)

	const isNftVolumeEnabled = !!(toggledMetrics.nftVolume === 'true' && metrics.nfts && isRouterReady)
	const { data: nftVolumeData = null, isLoading: fetchingNftVolume } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'nft-volume'],
		queryFn: () =>
			isNftVolumeEnabled
				? fetchJson<Array<[number, number]> | null>(
						buildProtocolChartApiUrl({ kind: 'nft-volume', protocol: name })
					).catch((): Array<[number, number]> => [])
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isNftVolumeEnabled
	})

	const showNonUsdDenomination = !!(
		selectedDenomination &&
		selectedDenomination.symbol !== 'USD' &&
		denominationPriceHistory
	)
	const valueSymbol = showNonUsdDenomination ? (selectedDenomination?.symbol ?? '') : '$'

	const chartData = useMemo(() => {
		const loadingStates: Array<{ isLoading: boolean; label: string }> = [
			{ isLoading: !!denominationGeckoId && fetchingDenominationPriceHistory, label: 'Denomination Price History' },
			{ isLoading: isMcapToggled && fetchingProtocolTokenData, label: 'Mcap' },
			{ isLoading: isTokenPriceToggled && fetchingProtocolTokenData, label: 'Token Price' },
			{ isLoading: isTokenVolumeToggled && fetchingProtocolTokenData, label: 'Token Volume' },
			{ isLoading: isFdvToggled && (fetchingProtocolTokenData || fetchingTokenTotalSupply), label: 'FDV' },
			{ isLoading: toggledMetrics.tokenLiquidity === 'true' && fetchingTokenLiquidity, label: 'Token Liquidity' },
			{ isLoading: shouldFetchBaseTvlChart && fetchingBaseTvlChart, label: primaryTvlChartLabel },
			{ isLoading: shouldFetchPool2Tvl && fetchingPool2TvlChart, label: primaryTvlChartLabel },
			{ isLoading: shouldFetchStakingTvl && fetchingStakingTvlChart, label: 'Staking' },
			{ isLoading: shouldFetchBorrowedTvl && fetchingBorrowedTvlChart, label: 'Active Loans' },
			{
				isLoading:
					(shouldFetchDoubleCountedTvl && fetchingDoubleCountedTvlChart) ||
					(shouldFetchLiquidStakingTvl && fetchingLiquidStakingTvlChart) ||
					(shouldFetchVestingTvl && fetchingVestingTvlChart) ||
					(shouldFetchGovTokensTvl && fetchingGovTokensTvlChart),
				label: primaryTvlChartLabel
			},
			{ isLoading: isTvsToggled && fetchingTvs, label: 'TVS' },
			{ isLoading: isFeesEnabled && (fetchingFees || fetchingBribes || fetchingTokenTaxes), label: 'Fees' },
			{ isLoading: isRevenueEnabled && (fetchingRevenue || fetchingBribes || fetchingTokenTaxes), label: 'Revenue' },
			{
				isLoading: isHoldersRevenueEnabled && (fetchingHoldersRevenue || fetchingBribes || fetchingTokenTaxes),
				label: 'Holders Revenue'
			},
			{ isLoading: isDexVolumeEnabled && fetchingDexVolume, label: 'DEX Volume' },
			{ isLoading: isDexNotionalVolumeEnabled && fetchingDexNotionalVolume, label: 'DEX Notional Volume' },
			{ isLoading: isPerpsVolumeEnabled && fetchingPerpVolume, label: 'Perp Volume' },
			{ isLoading: isOpenInterestEnabled && fetchingOpenInterest, label: 'Open Interest' },
			{ isLoading: isOptionsPremiumVolumeEnabled && fetchingOptionsPremiumVolume, label: 'Options Premium Volume' },
			{
				isLoading: isOptionsNotionalVolumeEnabled && fetchingOptionsNotionalVolume,
				label: 'Options Notional Volume'
			},
			{ isLoading: isDexAggregatorsVolumeEnabled && fetchingDexAggregatorVolume, label: 'DEX Aggregator Volume' },
			{ isLoading: isPerpsAggregatorsVolumeEnabled && fetchingPerpAggregatorVolume, label: 'Perp Aggregator Volume' },
			{
				isLoading: isBridgeAggregatorsVolumeEnabled && fetchingBridgeAggregatorVolume,
				label: 'Bridge Aggregator Volume'
			},
			{ isLoading: isUnlocksToggled && fetchingUnlocksAndIncentives, label: 'Unlocks' },
			{ isLoading: isIncentivesToggled && fetchingUnlocksAndIncentives, label: 'Incentives' },
			{ isLoading: isTreasuryToggled && fetchingTreasury, label: 'Treasury' },
			{ isLoading: isUsdInflowsToggled && fetchingUsdInflows, label: 'USD Inflows' },
			{ isLoading: toggledMetrics.medianApy === 'true' && fetchingMedianAPY, label: 'Median APY' },
			{ isLoading: toggledMetrics.totalProposals === 'true' && fetchingGovernanceData, label: 'Total Proposals' },
			{
				isLoading: toggledMetrics.successfulProposals === 'true' && fetchingGovernanceData,
				label: 'Successful Proposals'
			},
			{ isLoading: toggledMetrics.maxVotes === 'true' && fetchingGovernanceData, label: 'Max Votes' },
			{ isLoading: isNftVolumeToggled && fetchingNftVolume, label: 'NFT Volume' },
			{ isLoading: isActiveAddressesToggled && fetchingActiveAddresses, label: 'Active Addresses' },
			{ isLoading: isNewAddressesToggled && fetchingNewAddresses, label: 'New Addresses' },
			{ isLoading: isTransactionsToggled && fetchingTransactions, label: 'Transactions' },
			{ isLoading: isGasUsedToggled && fetchingGasUsed, label: 'Gas Used' },
			{ isLoading: isBridgeVolumeToggled && fetchingBridgeVolume, label: 'Bridge Volume' }
		]
		const loadingCharts: string[] = []
		const loadingChartSet = new Set(loadingCharts)
		for (const state of loadingStates) {
			if (!state.isLoading || loadingChartSet.has(state.label)) continue
			loadingCharts.push(state.label)
			loadingChartSet.add(state.label)
		}

		const charts: { [key in ProtocolChartsLabels]?: Array<[number, number | null]> } = {}

		if (tvlChart?.length > 0 && (isTvlToggled || isTotalAssetsToggled)) {
			const chartName: ProtocolChartsLabels = isCEX ? 'Total Assets' : ('TVL' as const)
			charts[chartName] = tvlChart
		}
		if (tvsData?.length > 0 && isTvsToggled) {
			charts['TVS'] = formatLineChart({ data: tvsData, groupBy, denominationPriceHistory })
		}
		if (protocolTokenData) {
			if (isMcapToggled)
				charts['Mcap'] = formatLineChart({
					data: protocolTokenData.mcaps,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			if (isTokenPriceToggled)
				charts['Token Price'] = formatLineChart({
					data: protocolTokenData.prices,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			if (isTokenVolumeToggled)
				charts['Token Volume'] = formatBarChart({
					data: protocolTokenData.volumes,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			if (isFdvToggled && tokenTotalSupply != null) {
				const fdvData: Array<[number, number]> = []
				for (const [date, price] of protocolTokenData.prices) {
					fdvData.push([date, price * tokenTotalSupply])
				}
				charts['FDV'] = formatLineChart({
					data: fdvData,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
		}
		if (tokenLiquidityData)
			charts['Token Liquidity'] = formatLineChart({ data: tokenLiquidityData, groupBy, denominationPriceHistory })

		const feeFamilyCharts = buildProtocolFeeFamilyCharts({
			fees: feesDataChart,
			revenue: revenueDataChart,
			holdersRevenue: holdersRevenueDataChart,
			bribes: enabledBribesDataChart,
			tokenTaxes: enabledTokenTaxesDataChart,
			groupBy,
			denominationPriceHistory
		})
		if (feeFamilyCharts.fees.length > 0) charts['Fees'] = feeFamilyCharts.fees
		if (feeFamilyCharts.revenue.length > 0) charts['Revenue'] = feeFamilyCharts.revenue
		if (feeFamilyCharts.holdersRevenue.length > 0) charts['Holders Revenue'] = feeFamilyCharts.holdersRevenue

		const adapterChartData: Record<NonFeeAdapterChartDescriptorLabel, Array<[number, number]> | null> = {
			'DEX Volume': dexVolumeDataChart,
			'DEX Notional Volume': dexNotionalVolumeDataChart,
			'Perp Volume': perpsVolumeDataChart,
			'Open Interest': openInterestDataChart,
			'Options Premium Volume': optionsPremiumVolumeDataChart,
			'Options Notional Volume': optionsNotionalVolumeDataChart,
			'DEX Aggregator Volume': dexAggregatorsVolumeDataChart,
			'Perp Aggregator Volume': perpsAggregatorsVolumeDataChart,
			'Bridge Aggregator Volume': bridgeAggregatorsVolumeDataChart
		}

		for (const descriptor of ADAPTER_CHART_DESCRIPTORS) {
			if (descriptor.renderKind === 'feeFamily') continue
			const label = descriptor.label as NonFeeAdapterChartDescriptorLabel
			const chart = adapterChartData[label]
			if (!chart) continue
			charts[label] =
				descriptor.renderKind === 'line'
					? formatLineChart({ data: chart, groupBy, denominationPriceHistory })
					: formatBarChart({ data: chart, groupBy, denominationPriceHistory })
		}

		if (
			isUnlocksToggled &&
			unlocksAndIncentivesData?.chartData?.documented &&
			unlocksAndIncentivesData.chartData.documented.length > 0
		) {
			const store: Record<string, number> = {}
			for (const { timestamp, ...rest } of unlocksAndIncentivesData.chartData.documented) {
				const dateSec = Math.floor(timestamp / 1e3)
				const dateKey = getGroupedTimestampSec(dateSec, groupBy)
				let total = 0
				for (const label in rest) {
					const val = rest[label]
					if (val != null) total += val
				}
				store[dateKey] = (store[dateKey] ?? 0) + total
			}
			charts['Unlocks'] = buildChartRowsFromTimestampRecord(store, 1e3)
		}

		if (isIncentivesToggled && unlocksAndIncentivesData?.unlockUsdChart) {
			const nonZeroIndex = unlocksAndIncentivesData.unlockUsdChart.findIndex(([_, value]) => value > 0)
			const startIndex = nonZeroIndex === -1 ? 0 : nonZeroIndex
			charts['Incentives'] = formatBarChart({
				data: unlocksAndIncentivesData.unlockUsdChart.slice(startIndex),
				groupBy,
				denominationPriceHistory
			})
		}

		if (extraTvlCharts.charts.staking && isStakingTvlToggled) {
			const stakingChartData = buildChartRowsFromTimestampRecord(extraTvlCharts.charts.staking, 1e3)
			charts['Staking'] = formatLineChart({
				data: stakingChartData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		}
		if (extraTvlCharts.charts.borrowed && isBorrowedTvlToggled) {
			const borrowedChartData = buildChartRowsFromTimestampRecord(extraTvlCharts.charts.borrowed, 1e3)
			charts['Active Loans'] = formatLineChart({
				data: borrowedChartData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		}

		if (medianAPYData) {
			const medianAPYChartData: Array<[number, number]> = []
			for (const item of medianAPYData) {
				medianAPYChartData.push([+item.date * 1e3, Number(item.medianAPY) || 0])
			}
			charts['Median APY'] = formatLineChart({
				data: medianAPYChartData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory: null
			})
		}

		if (governanceData) {
			const totalProposals: Record<string, number> = {}
			const successfulProposals: Record<string, number> = {}
			const maxVotes: Record<string, number> = {}
			for (const gItem of governanceData) {
				for (const item of gItem.activity ?? []) {
					const date = Math.floor(+item.date / 86400) * 86400
					totalProposals[date] = (totalProposals[date] ?? 0) + (item['Total'] || 0)
					successfulProposals[date] = (successfulProposals[date] ?? 0) + (item['Successful'] || 0)
				}
				for (const item of gItem.maxVotes ?? []) {
					const date = Math.floor(+item.date / 86400) * 86400
					maxVotes[date] = (maxVotes[date] ?? 0) + (Number(item['Max Votes']) || 0)
				}
			}
			charts['Total Proposals'] = formatBarChart({
				data: buildChartRowsFromTimestampRecord(totalProposals),
				groupBy,
				denominationPriceHistory: null
			})
			charts['Successful Proposals'] = formatBarChart({
				data: buildChartRowsFromTimestampRecord(successfulProposals),
				groupBy,
				denominationPriceHistory: null
			})
			charts['Max Votes'] = formatLineChart({
				data: buildChartRowsFromTimestampRecord(maxVotes),
				groupBy,
				denominationPriceHistory: null
			})
		}

		if (nftVolumeData && isNftVolumeToggled)
			charts['NFT Volume'] = formatBarChart({
				data: nftVolumeData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		if (activeAddressesData && isActiveAddressesToggled)
			charts['Active Addresses'] = formatBarChart({
				data: activeAddressesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		if (newAddressesData && isNewAddressesToggled)
			charts['New Addresses'] = formatBarChart({
				data: newAddressesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		if (transactionsData && isTransactionsToggled)
			charts['Transactions'] = formatBarChart({
				data: transactionsData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		if (gasUsedData && isGasUsedToggled)
			charts['Gas Used'] = formatBarChart({
				data: gasUsedData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		if (treasuryData && isTreasuryToggled)
			charts['Treasury'] = formatLineChart({ data: treasuryData, groupBy, dateInMs: true, denominationPriceHistory })
		if (usdInflowsData && isUsdInflowsToggled)
			charts['USD Inflows'] = formatBarChart({ data: usdInflowsData, groupBy, denominationPriceHistory })
		if (bridgeVolumeData && isBridgeVolumeToggled)
			charts['Bridge Volume'] = formatBarChart({
				data: bridgeVolumeData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})

		const filteredCharts: Record<string, Array<[number, number | null]>> = {}
		for (const chartLabel in charts) {
			const queryParamKey = protocolCharts[chartLabel as ProtocolChartsLabels]
			if (!queryParamKey || toggledMetrics[queryParamKey] === 'true') {
				filteredCharts[chartLabel] = charts[chartLabel]
			}
		}

		const failedMetrics = availableCharts.filter((chartLabel) => {
			const queryParamKey = protocolCharts[chartLabel]
			if (!queryParamKey || toggledMetrics[queryParamKey] !== 'true') return false
			if (loadingChartSet.has(chartLabel)) return false
			return !Object.prototype.hasOwnProperty.call(filteredCharts, chartLabel)
		})
		if (enabledBribesChartError || enabledTokenTaxesChartError) {
			if (isFeesEnabled && !failedMetrics.includes('Fees')) {
				failedMetrics.push('Fees')
			}
			if (isRevenueEnabled && !failedMetrics.includes('Revenue')) {
				failedMetrics.push('Revenue')
			}
			if (isHoldersRevenueEnabled && !failedMetrics.includes('Holders Revenue')) {
				failedMetrics.push('Holders Revenue')
			}
		}

		return { finalCharts: filteredCharts, valueSymbol, loadingCharts, failedMetrics }
	}, [
		tvlChart,
		fetchingDenominationPriceHistory,
		denominationPriceHistory,
		fetchingProtocolTokenData,
		protocolTokenData,
		fetchingTokenTotalSupply,
		tokenTotalSupply,
		fetchingTokenLiquidity,
		tokenLiquidityData,
		fetchingBaseTvlChart,
		shouldFetchBaseTvlChart,
		fetchingPool2TvlChart,
		shouldFetchPool2Tvl,
		fetchingStakingTvlChart,
		shouldFetchStakingTvl,
		fetchingBorrowedTvlChart,
		shouldFetchBorrowedTvl,
		fetchingDoubleCountedTvlChart,
		shouldFetchDoubleCountedTvl,
		fetchingLiquidStakingTvlChart,
		shouldFetchLiquidStakingTvl,
		fetchingVestingTvlChart,
		shouldFetchVestingTvl,
		fetchingGovTokensTvlChart,
		shouldFetchGovTokensTvl,
		denominationGeckoId,
		isFeesEnabled,
		isRevenueEnabled,
		isHoldersRevenueEnabled,
		isDexVolumeEnabled,
		isDexNotionalVolumeEnabled,
		isPerpsVolumeEnabled,
		isOpenInterestEnabled,
		isOptionsPremiumVolumeEnabled,
		isOptionsNotionalVolumeEnabled,
		isDexAggregatorsVolumeEnabled,
		isPerpsAggregatorsVolumeEnabled,
		isBridgeAggregatorsVolumeEnabled,
		fetchingFees,
		feesDataChart,
		fetchingRevenue,
		revenueDataChart,
		fetchingHoldersRevenue,
		holdersRevenueDataChart,
		fetchingBribes,
		enabledBribesDataChart,
		enabledBribesChartError,
		fetchingTokenTaxes,
		enabledTokenTaxesDataChart,
		enabledTokenTaxesChartError,
		fetchingDexVolume,
		dexVolumeDataChart,
		fetchingDexNotionalVolume,
		dexNotionalVolumeDataChart,
		fetchingPerpVolume,
		perpsVolumeDataChart,
		fetchingOpenInterest,
		openInterestDataChart,
		fetchingOptionsPremiumVolume,
		optionsPremiumVolumeDataChart,
		fetchingOptionsNotionalVolume,
		optionsNotionalVolumeDataChart,
		fetchingDexAggregatorVolume,
		dexAggregatorsVolumeDataChart,
		fetchingPerpAggregatorVolume,
		perpsAggregatorsVolumeDataChart,
		fetchingBridgeAggregatorVolume,
		bridgeAggregatorsVolumeDataChart,
		fetchingTvs,
		tvsData,
		fetchingUnlocksAndIncentives,
		unlocksAndIncentivesData,
		fetchingTreasury,
		treasuryData,
		fetchingUsdInflows,
		usdInflowsData,
		fetchingMedianAPY,
		medianAPYData,
		fetchingActiveAddresses,
		activeAddressesData,
		fetchingNewAddresses,
		newAddressesData,
		fetchingTransactions,
		transactionsData,
		fetchingGasUsed,
		gasUsedData,
		fetchingGovernanceData,
		governanceData,
		fetchingNftVolume,
		nftVolumeData,
		fetchingBridgeVolume,
		bridgeVolumeData,
		isTvlToggled,
		isTotalAssetsToggled,
		isTvsToggled,
		isMcapToggled,
		isTokenPriceToggled,
		isTokenVolumeToggled,
		isFdvToggled,
		isUnlocksToggled,
		isIncentivesToggled,
		isStakingTvlToggled,
		isBorrowedTvlToggled,
		isNftVolumeToggled,
		isActiveAddressesToggled,
		isNewAddressesToggled,
		isTransactionsToggled,
		isGasUsedToggled,
		isTreasuryToggled,
		isUsdInflowsToggled,
		isBridgeVolumeToggled,
		primaryTvlChartLabel,
		toggledMetrics,
		groupBy,
		extraTvlCharts,
		availableCharts,
		valueSymbol,
		isCEX
	])

	return chartData
}
