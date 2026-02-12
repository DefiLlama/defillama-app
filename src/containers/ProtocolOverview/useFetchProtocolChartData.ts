import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import {
	BRIDGEVOLUME_API_SLUG,
	CACHE_SERVER,
	NFT_MARKETPLACES_VOLUME_API,
	PROTOCOL_TREASURY_API,
	TOKEN_LIQUIDITY_API
} from '~/constants'
import { getAdapterProtocolChartData } from '~/containers/DimensionAdapters/api'
import { useFetchProtocolGovernanceData } from '~/containers/Governance/queries.client'
import {
	useFetchProtocolActiveUsers,
	useFetchProtocolMedianAPY,
	useFetchProtocolNewUsers,
	useFetchProtocolTransactions,
	useFetchProtocolTVLChart
} from '~/containers/ProtocolOverview/queries.client'
import type { EmissionsChartRow } from '~/containers/Unlocks/api.types'
import { getProtocolEmissionsCharts } from '~/containers/Unlocks/queries'
import { firstDayOfMonth, lastDayOfWeek, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { protocolCharts, type ProtocolChartsLabels } from './constants'
import type { IDenominationPriceHistory, IProtocolOverviewPageData, IToggledMetrics } from './types'

type ChartInterval = 'daily' | 'weekly' | 'monthly' | 'cumulative'
type V2ChartPoint = [string | number, number]
/** Maximum allowed difference (in seconds) between chart latest timestamps for alignment. */
const MAX_TVL_TIMESTAMP_ALIGNMENT_DIFF_SEC = 24 * 60 * 60

const toUnixSeconds = (timestamp: string | number): number | null => {
	const parsed = Number(timestamp)
	if (!Number.isFinite(parsed)) return null
	return parsed >= 1e12 ? Math.floor(parsed / 1e3) : Math.floor(parsed)
}

const getLatestTimestamp = (chart: Array<[string | number, number]>): number | null => {
	if (chart.length === 0) return null
	const lastPoint = chart[chart.length - 1]
	return lastPoint ? toUnixSeconds(lastPoint[0]) : null
}

interface ExtraTvlChartsResult {
	charts: Record<string, Record<string, number>>
	latestTimestamps: Record<string, number>
}

const buildExtraTvlCharts = (
	chartByKey: Record<string, Array<V2ChartPoint> | null>
): ExtraTvlChartsResult => {
	const charts: Record<string, Record<string, number>> = {}
	const latestTimestamps: Record<string, number> = {}

	for (const key in chartByKey) {
		const chart = chartByKey[key]
		if (!chart || chart.length === 0) continue

		const byDate: Record<string, number> = {}
		let maxTimestamp: number | null = null
		for (const [timestamp, value] of chart) {
			const dateInSec = toUnixSeconds(timestamp)
			if (dateInSec == null) continue
			byDate[String(dateInSec)] = value
			if (maxTimestamp == null || dateInSec > maxTimestamp) maxTimestamp = dateInSec
		}

		if (Object.keys(byDate).length > 0) {
			charts[key] = byDate
			if (maxTimestamp != null) latestTimestamps[key] = maxTimestamp
		}
	}

	return { charts, latestTimestamps }
}

const buildTvlChart = ({
	tvlChartData,
	extraTvlCharts,
	tvlSettings,
	currentTvlByChain,
	groupBy,
	denominationPriceHistory
}: {
	tvlChartData: Array<[string, number]>
	extraTvlCharts: ExtraTvlChartsResult
	tvlSettings: Record<string, boolean>
	currentTvlByChain: Record<string, number> | null
	groupBy: ChartInterval
	denominationPriceHistory: Record<string, number> | null
}): Array<[number, number | null]> => {
	const extraTvls: string[] = []
	for (const extra in tvlSettings) {
		if (tvlSettings[extra] && currentTvlByChain?.[extra] != null) {
			extraTvls.push(extra)
		}
	}

	if (extraTvls.length === 0) {
		return formatLineChart({ data: tvlChartData, groupBy, denominationPriceHistory })
	}

	const store: Record<string, number> = {}
	const isWeekly = groupBy === 'weekly'
	const isMonthly = groupBy === 'monthly'
	const latestMainTvlTimestamp = getLatestTimestamp(tvlChartData)
	let mostRecentTvlTimestamp = latestMainTvlTimestamp

	for (const extra of extraTvls) {
		const extraLatestTimestamp = extraTvlCharts.latestTimestamps[extra]
		if (extraLatestTimestamp == null) continue
		if (mostRecentTvlTimestamp == null || extraLatestTimestamp > mostRecentTvlTimestamp) {
			mostRecentTvlTimestamp = extraLatestTimestamp
		}
	}

	const shouldNormalizeMainTvlLatest =
		latestMainTvlTimestamp != null &&
		mostRecentTvlTimestamp != null &&
		Math.abs(mostRecentTvlTimestamp - latestMainTvlTimestamp) <= MAX_TVL_TIMESTAMP_ALIGNMENT_DIFF_SEC

	for (const [rawDate, value] of tvlChartData) {
		const dateInSec = toUnixSeconds(rawDate)
		if (dateInSec == null) continue
		const alignedDateInSec =
			shouldNormalizeMainTvlLatest && dateInSec === latestMainTvlTimestamp
				? mostRecentTvlTimestamp!
				: dateInSec
		const dateKey = isWeekly
			? lastDayOfWeek(alignedDateInSec)
			: isMonthly
				? firstDayOfMonth(alignedDateInSec)
				: alignedDateInSec
		let extrasAtTimestamp = 0
		for (const extra of extraTvls) {
			const extraChart = extraTvlCharts.charts[extra]
			if (!extraChart) continue
			let extraValue = extraChart[String(dateInSec)]
			if (extraValue == null && alignedDateInSec !== dateInSec) {
				extraValue = extraChart[String(alignedDateInSec)]
			}

			// Align only near the latest timestamp so we don't shift stale charts.
			if (
				extraValue == null &&
				latestMainTvlTimestamp != null &&
				dateInSec === latestMainTvlTimestamp &&
				mostRecentTvlTimestamp != null
			) {
				const extraLatestTimestamp = extraTvlCharts.latestTimestamps[extra]
				if (
					extraLatestTimestamp != null &&
					Math.abs(mostRecentTvlTimestamp - extraLatestTimestamp) <= MAX_TVL_TIMESTAMP_ALIGNMENT_DIFF_SEC
				) {
					extraValue = extraChart[String(extraLatestTimestamp)]
				}
			}
			extrasAtTimestamp += extraValue ?? 0
		}
		store[String(dateKey)] =
			value + extrasAtTimestamp
	}

	const finalChart: Array<[number, number | null]> = []
	for (const date in store) {
		const dateInSec = Number(date)
		const dateInMs = Number(date) * 1e3
		const denominationRate =
			denominationPriceHistory?.[String(dateInSec)] ?? denominationPriceHistory?.[String(dateInMs)]
		const finalValue = denominationPriceHistory
			? denominationRate
				? store[date] / denominationRate
				: null
			: store[date]
		if (finalValue !== null) {
			finalChart.push([dateInMs, finalValue])
		}
	}

	return finalChart
}

const buildUsdInflowsFromTvlChart = (tvlChart: Array<[number, number | null]>): Array<[number, number]> | null => {
	if (tvlChart.length < 2) return null

	const inflows: Array<[number, number]> = []
	for (let i = 1; i < tvlChart.length; i++) {
		const [timestamp, value] = tvlChart[i]
		const previousValue = tvlChart[i - 1][1]
		if (value == null || previousValue == null || !Number.isFinite(value) || !Number.isFinite(previousValue)) continue
		inflows.push([Math.floor(timestamp / 1e3), value - previousValue])
	}

	return inflows.length > 0 ? inflows : null
}

export const useFetchProtocolChartData = ({
	name,
	id: protocolId,
	geckoId,
	currentTvlByChain,
	tvlChartData,
	metrics,
	toggledMetrics,
	groupBy,
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

	const denominationGeckoId = isRouterReady ? (selectedDenomination?.geckoId ?? null) : null
	const { data: denominationPriceHistory = null, isLoading: fetchingDenominationPriceHistory } = useQuery<Record<
		string,
		number
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'denomination-price-history', denominationGeckoId],
		queryFn: () =>
			fetchJson(`${CACHE_SERVER}/cgchart/${denominationGeckoId}?fullChart=true`).then(
				(res: { data?: { prices?: Array<[number, number]> } }) => {
					if (!res.data?.prices?.length) return null
					const store: Record<string, number> = {}
					for (const [date, value] of res.data.prices) {
						store[String(date)] = value
						store[String(Math.floor(Number(date) / 1e3))] = value
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
		useQuery<IDenominationPriceHistory | null>({
			queryKey: ['protocol-overview', protocolSlug, 'token-price-history', geckoId],
			queryFn: () =>
				fetchJson(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`).then(
					(res: { data?: IDenominationPriceHistory }) =>
						res.data?.prices?.length ? res.data : null
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
			fetchJson(`${CACHE_SERVER}/supply/${geckoId}`).then(
				(res: { data?: { total_supply?: number } }) => res.data?.['total_supply'] ?? null
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!(geckoId && toggledMetrics.fdv === 'true' && isRouterReady)
	})
	const { data: tokenLiquidityData = null, isLoading: fetchingTokenLiquidity } = useQuery<Array<
		[string | number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'token-liquidity', protocolId],
		queryFn: () => fetchJson(`${TOKEN_LIQUIDITY_API}/${protocolId.replaceAll('#', '$')}`).catch(() => null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!(isRouterReady && metrics.liquidity && toggledMetrics.tokenLiquidity === 'true')
	})

	const shouldFetchStakingTvl = !!(
		isRouterReady &&
		currentTvlByChain?.staking != null &&
		(tvlSettings?.staking || toggledMetrics.staking_tvl === 'true')
	)
	const shouldFetchBorrowedTvl = !!(
		isRouterReady &&
		currentTvlByChain?.borrowed != null &&
		(tvlSettings?.borrowed || toggledMetrics.borrowed_tvl === 'true')
	)
	const shouldFetchPool2Tvl = !!(isRouterReady && currentTvlByChain?.pool2 != null && tvlSettings?.pool2)
	const shouldFetchDoubleCountedTvl = !!(
		isRouterReady &&
		currentTvlByChain?.doublecounted != null &&
		tvlSettings?.doublecounted
	)
	const shouldFetchLiquidStakingTvl = !!(
		isRouterReady &&
		currentTvlByChain?.liquidstaking != null &&
		tvlSettings?.liquidstaking
	)
	const shouldFetchVestingTvl = !!(isRouterReady && currentTvlByChain?.vesting != null && tvlSettings?.vesting)
	const shouldFetchGovTokensTvl = !!(isRouterReady && currentTvlByChain?.govtokens != null && tvlSettings?.govtokens)

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
				tvlChartData,
				extraTvlCharts,
				tvlSettings,
				currentTvlByChain,
				groupBy,
				denominationPriceHistory
			}),
		[tvlChartData, extraTvlCharts, tvlSettings, groupBy, denominationPriceHistory, currentTvlByChain]
	)

	const isFeesEnabled = !!(toggledMetrics.fees === 'true' && metrics.fees && isRouterReady)
	const { data: feesDataChart = null, isLoading: fetchingFees } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'fees'],
		queryFn: () =>
			isFeesEnabled
				? getAdapterProtocolChartData({
						adapterType: 'fees',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isFeesEnabled
	})

	const isRevenueEnabled = !!(toggledMetrics.revenue === 'true' && metrics.revenue && isRouterReady)
	const { data: revenueDataChart = null, isLoading: fetchingRevenue } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'revenue'],
		queryFn: () =>
			isRevenueEnabled
				? getAdapterProtocolChartData({
						adapterType: 'fees',
						dataType: 'dailyRevenue',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isRevenueEnabled
	})

	const isHoldersRevenueEnabled = !!(
		toggledMetrics.holdersRevenue === 'true' &&
		(metrics.fees || metrics.revenue) &&
		isRouterReady
	)
	const { data: holdersRevenueDataChart = null, isLoading: fetchingHoldersRevenue } = useQuery<Array<
		[number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'holders-revenue'],
		queryFn: () =>
			isHoldersRevenueEnabled
				? getAdapterProtocolChartData({
						adapterType: 'fees',
						dataType: 'dailyHoldersRevenue',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isHoldersRevenueEnabled
	})

	const isBribesEnabled = !!(
		(toggledMetrics.fees === 'true' || toggledMetrics.revenue === 'true' || toggledMetrics.holdersRevenue === 'true') &&
		feesSettings?.bribes &&
		metrics.bribes &&
		isRouterReady
	)
	const { data: bribesDataChart = null, isLoading: fetchingBribes } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'bribes'],
		queryFn: () =>
			isBribesEnabled
				? getAdapterProtocolChartData({
						adapterType: 'fees',
						dataType: 'dailyBribesRevenue',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isBribesEnabled
	})

	const isTokenTaxesEnabled = !!(
		(toggledMetrics.fees === 'true' || toggledMetrics.revenue === 'true' || toggledMetrics.holdersRevenue === 'true') &&
		feesSettings?.tokentax &&
		metrics.tokenTax &&
		isRouterReady
	)
	const { data: tokenTaxesDataChart = null, isLoading: fetchingTokenTaxes } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'token-taxes'],
		queryFn: () =>
			isTokenTaxesEnabled
				? getAdapterProtocolChartData({
						adapterType: 'fees',
						dataType: 'dailyTokenTaxes',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isTokenTaxesEnabled
	})

	const isDexVolumeEnabled = !!(toggledMetrics.dexVolume === 'true' && metrics.dexs && isRouterReady)
	const { data: dexVolumeDataChart = null, isLoading: fetchingDexVolume } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'dex-volume'],
		queryFn: () =>
			isDexVolumeEnabled
				? getAdapterProtocolChartData({
						adapterType: 'dexs',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isDexVolumeEnabled
	})

	const isPerpsVolumeEnabled = !!(toggledMetrics.perpVolume === 'true' && metrics.perps && isRouterReady)
	const { data: perpsVolumeDataChart = null, isLoading: fetchingPerpVolume } = useQuery<Array<[number, number]> | null>(
		{
			queryKey: ['protocol-overview', protocolSlug, 'perp-volume'],
			queryFn: () =>
				isPerpsVolumeEnabled
					? getAdapterProtocolChartData({
							adapterType: 'derivatives',
							protocol: name
						})
					: Promise.resolve(null),
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0,
			enabled: isPerpsVolumeEnabled
		}
	)

	const isOpenInterestEnabled = !!(toggledMetrics.openInterest === 'true' && metrics.openInterest && isRouterReady)
	const { data: openInterestDataChart = null, isLoading: fetchingOpenInterest } = useQuery<Array<
		[number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'open-interest'],
		queryFn: () =>
			isOpenInterestEnabled
				? getAdapterProtocolChartData({
						adapterType: 'open-interest',
						protocol: name,
						dataType: 'openInterestAtEnd'
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isOpenInterestEnabled
	})

	const isOptionsPremiumVolumeEnabled = !!(
		toggledMetrics.optionsPremiumVolume === 'true' &&
		metrics.optionsPremiumVolume &&
		isRouterReady
	)
	const { data: optionsPremiumVolumeDataChart = null, isLoading: fetchingOptionsPremiumVolume } = useQuery<Array<
		[number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'options-premium-volume'],
		queryFn: () =>
			isOptionsPremiumVolumeEnabled
				? getAdapterProtocolChartData({
						adapterType: 'options',
						dataType: 'dailyPremiumVolume',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isOptionsPremiumVolumeEnabled
	})

	const isOptionsNotionalVolumeEnabled = !!(
		toggledMetrics.optionsNotionalVolume === 'true' &&
		metrics.optionsNotionalVolume &&
		isRouterReady
	)
	const { data: optionsNotionalVolumeDataChart = null, isLoading: fetchingOptionsNotionalVolume } = useQuery<Array<
		[number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'options-notional-volume'],
		queryFn: () =>
			isOptionsNotionalVolumeEnabled
				? getAdapterProtocolChartData({
						adapterType: 'options',
						dataType: 'dailyNotionalVolume',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isOptionsNotionalVolumeEnabled
	})

	const isDexAggregatorsVolumeEnabled = !!(
		toggledMetrics.dexAggregatorVolume === 'true' &&
		metrics.dexAggregators &&
		isRouterReady
	)
	const { data: dexAggregatorsVolumeDataChart = null, isLoading: fetchingDexAggregatorVolume } = useQuery<Array<
		[number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'dex-aggregator-volume'],
		queryFn: () =>
			isDexAggregatorsVolumeEnabled
				? getAdapterProtocolChartData({
						adapterType: 'aggregators',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isDexAggregatorsVolumeEnabled
	})

	const isPerpsAggregatorsVolumeEnabled = !!(
		toggledMetrics.perpAggregatorVolume === 'true' &&
		metrics.perpsAggregators &&
		isRouterReady
	)
	const { data: perpsAggregatorsVolumeDataChart = null, isLoading: fetchingPerpAggregatorVolume } = useQuery<Array<
		[number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'perp-aggregator-volume'],
		queryFn: () =>
			isPerpsAggregatorsVolumeEnabled
				? getAdapterProtocolChartData({
						adapterType: 'aggregator-derivatives',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isPerpsAggregatorsVolumeEnabled
	})

	const isBridgeAggregatorsVolumeEnabled = !!(
		toggledMetrics.bridgeAggregatorVolume === 'true' &&
		metrics.bridgeAggregators &&
		isRouterReady
	)
	const { data: bridgeAggregatorsVolumeDataChart = null, isLoading: fetchingBridgeAggregatorVolume } = useQuery<Array<
		[number, number]
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'bridge-aggregator-volume'],
		queryFn: () =>
			isBridgeAggregatorsVolumeEnabled
				? getAdapterProtocolChartData({
						adapterType: 'bridge-aggregators',
						protocol: name
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isBridgeAggregatorsVolumeEnabled
	})

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
		queryFn: async () => {
			if (!isUnlocksEnabled) return null
			const result = await getProtocolEmissionsCharts(slug(name))
			return {
				...result,
				unlockUsdChart: Array.isArray(result.unlockUsdChart)
					? result.unlockUsdChart
							.filter(
								(item): item is [string | number, string | number] =>
									Array.isArray(item) &&
									item.length >= 2 &&
									Number.isFinite(Number(item[0])) &&
									Number.isFinite(Number(item[1]))
							)
							.map((item): [number, number] => [Number(item[0]), Number(item[1])])
					: null
			}
		},
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isUnlocksEnabled
	})

	const isTreasuryEnabled = !!(toggledMetrics.treasury === 'true' && metrics.treasury && isRouterReady)
	const { data: treasuryData = null, isLoading: fetchingTreasury } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'treasury'],
		queryFn: () =>
			isTreasuryEnabled
				? fetchJson(`${PROTOCOL_TREASURY_API}/${slug(name)}`).then(
						(data: { chainTvls: Record<string, { tvl?: Array<{ date: string; totalLiquidityUSD?: number }> }> }) => {
							const store: Record<string, number> = {}
							for (const chain in data.chainTvls) {
								if (chain.includes('-')) continue
								for (const item of data.chainTvls[chain].tvl ?? []) {
									store[item.date] = (store[item.date] ?? 0) + (item.totalLiquidityUSD ?? 0)
								}
							}
							const finalChart: Array<[number, number]> = []
							for (const date in store) {
								finalChart.push([+date * 1e3, store[date]])
							}
							return finalChart
						}
					)
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isTreasuryEnabled
	})

	const isUsdInflowsEnabled = !!(toggledMetrics.usdInflows === 'true' && metrics.tvl && isRouterReady)
	const usdInflowsData = useMemo(() => {
		if (!isUsdInflowsEnabled) return null

		const tvlChartInUsd = buildTvlChart({
			tvlChartData,
			extraTvlCharts,
			tvlSettings,
			currentTvlByChain,
			groupBy: 'daily',
			denominationPriceHistory: null
		})
		return buildUsdInflowsFromTvlChart(tvlChartInUsd)
	}, [isUsdInflowsEnabled, tvlChartData, extraTvlCharts, tvlSettings, currentTvlByChain])
	const fetchingUsdInflows = false

	const isBridgeVolumeEnabled = !!(toggledMetrics.bridgeVolume === 'true' && isRouterReady)
	const { data: bridgeVolumeData = null, isLoading: fetchingBridgeVolume } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'bridge-volume'],
		queryFn: () =>
			isBridgeVolumeEnabled
				? fetchJson(`${BRIDGEVOLUME_API_SLUG}/${slug(name)}`)
						.then((data: { dailyVolumes: Array<{ date: string; depositUSD: number; withdrawUSD: number }> }) => {
							const store: Record<string, number> = {}
							for (const item of data.dailyVolumes) {
								store[item.date] = (store[item.date] ?? 0) + (item.depositUSD + item.withdrawUSD) / 2
							}
							const finalChart: Array<[number, number]> = []
							for (const date in store) {
								finalChart.push([+date * 1e3, store[date]])
							}
							return finalChart
						})
						.catch(() => null)
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isBridgeVolumeEnabled
	})

	const { data: medianAPYData = null, isLoading: fetchingMedianAPY } = useFetchProtocolMedianAPY(
		isRouterReady && toggledMetrics.medianApy === 'true' && metrics.yields && !protocolId.startsWith('parent#')
			? slug(name)
			: null
	)

	const { data: activeAddressesData = null, isLoading: fetchingActiveAddresses } = useFetchProtocolActiveUsers(
		isRouterReady && toggledMetrics.activeAddresses === 'true' && metrics.activeUsers ? protocolId : null
	)
	const { data: newAddressesData = null, isLoading: fetchingNewAddresses } = useFetchProtocolNewUsers(
		isRouterReady && toggledMetrics.newAddresses === 'true' && metrics.activeUsers ? protocolId : null
	)
	const { data: transactionsData = null, isLoading: fetchingTransactions } = useFetchProtocolTransactions(
		isRouterReady && toggledMetrics.transactions === 'true' && metrics.activeUsers ? protocolId : null
	)

	const { data: governanceData = null, isLoading: fetchingGovernanceData } = useFetchProtocolGovernanceData(
		isRouterReady &&
			[toggledMetrics.totalProposals, toggledMetrics.successfulProposals, toggledMetrics.maxVotes].some(
				(v) => v === 'true'
			) &&
			governanceApis &&
			governanceApis.length > 0
			? governanceApis
			: null
	)

	const isNftVolumeEnabled = !!(toggledMetrics.nftVolume === 'true' && metrics.nfts && isRouterReady)
	const { data: nftVolumeData = null, isLoading: fetchingNftVolume } = useQuery<Array<[number, number]> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'nft-volume'],
		queryFn: () =>
			isNftVolumeEnabled
				? fetchJson(NFT_MARKETPLACES_VOLUME_API, { timeout: 10_000 })
						.then((r: Array<{ exchangeName: string; day: string; sumUsd: number }>) =>
							r
								.filter((item) => slug(item.exchangeName) === slug(name))
								.map(({ day, sumUsd }): [number, number] => [new Date(day).getTime(), sumUsd])
						)
						.catch((): Array<[number, number]> => [])
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isNftVolumeEnabled
	})

	const isTvlToggled = toggledMetrics.tvl === 'true'
	const isTotalAssetsToggled = toggledMetrics.totalAssets === 'true'
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
	const isTreasuryToggled = toggledMetrics.treasury === 'true'
	const isUsdInflowsToggled = toggledMetrics.usdInflows === 'true'
	const isBridgeVolumeToggled = toggledMetrics.bridgeVolume === 'true'

	const showNonUsdDenomination = !!(
		selectedDenomination &&
		selectedDenomination.symbol !== 'USD' &&
		denominationPriceHistory
	)
	const valueSymbol = showNonUsdDenomination ? (selectedDenomination?.symbol ?? '') : '$'

	const chartData = useMemo(() => {
		const loadingCharts: string[] = []
		if (fetchingDenominationPriceHistory) loadingCharts.push('Denomination Price History')
		if (fetchingProtocolTokenData) loadingCharts.push('Mcap, Token price, Token volume')
		if (fetchingTokenTotalSupply) loadingCharts.push('Token Supply')
		if (fetchingTokenLiquidity) loadingCharts.push('Token Liquidity')
		if (
			fetchingPool2TvlChart ||
			fetchingStakingTvlChart ||
			fetchingBorrowedTvlChart ||
			fetchingDoubleCountedTvlChart ||
			fetchingLiquidStakingTvlChart ||
			fetchingVestingTvlChart ||
			fetchingGovTokensTvlChart
		)
			loadingCharts.push('TVL Breakdown')
		if (fetchingFees) loadingCharts.push('Fees')
		if (fetchingRevenue) loadingCharts.push('Revenue')
		if (fetchingHoldersRevenue) loadingCharts.push('Holders Revenue')
		if (fetchingBribes) loadingCharts.push('Bribes')
		if (fetchingTokenTaxes) loadingCharts.push('Token Taxes')
		if (fetchingDexVolume) loadingCharts.push('DEX Volume')
		if (fetchingPerpVolume) loadingCharts.push('Perp Volume')
		if (fetchingOpenInterest) loadingCharts.push('Open Interest')
		if (fetchingOptionsPremiumVolume) loadingCharts.push('Options Premium Volume')
		if (fetchingOptionsNotionalVolume) loadingCharts.push('Options Notional Volume')
		if (fetchingDexAggregatorVolume) loadingCharts.push('DEX Aggregator Volume')
		if (fetchingPerpAggregatorVolume) loadingCharts.push('Perp Aggregator Volume')
		if (fetchingBridgeAggregatorVolume) loadingCharts.push('Bridge Aggregator Volume')
		if (fetchingUnlocksAndIncentives) loadingCharts.push('Emissions')
		if (fetchingTreasury) loadingCharts.push('Treasury')
		if (fetchingUsdInflows) loadingCharts.push('USD Inflows')
		if (fetchingMedianAPY) loadingCharts.push('Median APY')
		if (fetchingGovernanceData) loadingCharts.push('Governance')
		if (fetchingNftVolume) loadingCharts.push('NFT Volume')
		if (fetchingActiveAddresses) loadingCharts.push('Active Addresses')
		if (fetchingNewAddresses) loadingCharts.push('New Addresses')
		if (fetchingTransactions) loadingCharts.push('Transactions')
		if (fetchingBridgeVolume) loadingCharts.push('Bridge Volume')
		if (loadingCharts.length > 0) {
			return {
				finalCharts: {} as Record<string, Array<[string | number, number | null]>>,
				valueSymbol,
				loadingCharts: loadingCharts.join(', ').toLowerCase()
			}
		}

		const charts: { [key in ProtocolChartsLabels]?: Array<[number, number | null]> } = {}

		if (tvlChart?.length > 0 && (isTvlToggled || isTotalAssetsToggled)) {
			const chartName: ProtocolChartsLabels = isCEX ? 'Total Assets' : ('TVL' as const)
			charts[chartName] = tvlChart
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
			if (isFdvToggled && tokenTotalSupply != null && Number.isFinite(tokenTotalSupply))
				charts['FDV'] = formatLineChart({
					data: protocolTokenData.prices.map(([date, price]): [number, number] => [date, price * tokenTotalSupply]),
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
		}
		if (tokenLiquidityData)
			charts['Token Liquidity'] = formatLineChart({ data: tokenLiquidityData, groupBy, denominationPriceHistory })

		const feesStore: Record<string, number | null> = {}
		const revenueStore: Record<string, number | null> = {}
		const holdersRevenueStore: Record<string, number | null> = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'
		const applyValue = (date: number, value: number) => {
			if (!denominationPriceHistory) return value
			const price = denominationPriceHistory[String(date)] ?? denominationPriceHistory[String(+date * 1e3)]
			return price ? value / price : null
		}

		if (feesDataChart) {
			let total = 0
			for (const [date, value] of feesDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				if (finalValue == null) {
					feesStore[dateKey] = null
					continue
				}
				if (feesStore[dateKey] === null) continue
				feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}
		if (revenueDataChart) {
			let total = 0
			for (const [date, value] of revenueDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				if (finalValue == null) {
					revenueStore[dateKey] = null
					continue
				}
				if (revenueStore[dateKey] === null) continue
				revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}
		if (holdersRevenueDataChart) {
			let total = 0
			for (const [date, value] of holdersRevenueDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				if (finalValue == null) {
					holdersRevenueStore[dateKey] = null
					continue
				}
				if (holdersRevenueStore[dateKey] === null) continue
				holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}
		if (bribesDataChart) {
			let total = 0
			for (const [date, value] of bribesDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				if (finalValue == null) {
					if (feesDataChart) feesStore[dateKey] = null
					if (revenueDataChart) revenueStore[dateKey] = null
					if (holdersRevenueDataChart) holdersRevenueStore[dateKey] = null
					continue
				}
				if (feesDataChart && feesStore[dateKey] !== null)
					feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				if (revenueDataChart && revenueStore[dateKey] !== null)
					revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				if (holdersRevenueDataChart && holdersRevenueStore[dateKey] !== null)
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}
		if (tokenTaxesDataChart) {
			let total = 0
			for (const [date, value] of tokenTaxesDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				if (finalValue == null) {
					if (feesDataChart) feesStore[dateKey] = null
					if (revenueDataChart) revenueStore[dateKey] = null
					if (holdersRevenueDataChart) holdersRevenueStore[dateKey] = null
					continue
				}
				if (feesDataChart && feesStore[dateKey] !== null)
					feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				if (revenueDataChart && revenueStore[dateKey] !== null)
					revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				if (holdersRevenueDataChart && holdersRevenueStore[dateKey] !== null)
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}

		const finalFeesChart = Object.entries(feesStore).map(
			([date, value]) => [+date * 1e3, value] as [number, number | null]
		)
		const finalRevenueChart = Object.entries(revenueStore).map(
			([date, value]) => [+date * 1e3, value] as [number, number | null]
		)
		const finalHoldersRevenueChart = Object.entries(holdersRevenueStore).map(
			([date, value]) => [+date * 1e3, value] as [number, number | null]
		)
		if (finalFeesChart.length > 0) charts['Fees'] = finalFeesChart
		if (finalRevenueChart.length > 0) charts['Revenue'] = finalRevenueChart
		if (finalHoldersRevenueChart.length > 0) charts['Holders Revenue'] = finalHoldersRevenueChart

		if (dexVolumeDataChart)
			charts['DEX Volume'] = formatBarChart({ data: dexVolumeDataChart, groupBy, denominationPriceHistory })
		if (perpsVolumeDataChart)
			charts['Perp Volume'] = formatBarChart({ data: perpsVolumeDataChart, groupBy, denominationPriceHistory })
		if (openInterestDataChart)
			charts['Open Interest'] = formatLineChart({ data: openInterestDataChart, groupBy, denominationPriceHistory })
		if (optionsPremiumVolumeDataChart)
			charts['Options Premium Volume'] = formatBarChart({
				data: optionsPremiumVolumeDataChart,
				groupBy,
				denominationPriceHistory
			})
		if (optionsNotionalVolumeDataChart)
			charts['Options Notional Volume'] = formatBarChart({
				data: optionsNotionalVolumeDataChart,
				groupBy,
				denominationPriceHistory
			})
		if (dexAggregatorsVolumeDataChart)
			charts['DEX Aggregator Volume'] = formatBarChart({
				data: dexAggregatorsVolumeDataChart,
				groupBy,
				denominationPriceHistory
			})
		if (perpsAggregatorsVolumeDataChart)
			charts['Perp Aggregator Volume'] = formatBarChart({
				data: perpsAggregatorsVolumeDataChart,
				groupBy,
				denominationPriceHistory
			})
		if (bridgeAggregatorsVolumeDataChart)
			charts['Bridge Aggregator Volume'] = formatBarChart({
				data: bridgeAggregatorsVolumeDataChart,
				groupBy,
				denominationPriceHistory
			})

		if (
			isUnlocksToggled &&
			unlocksAndIncentivesData?.chartData?.documented &&
			unlocksAndIncentivesData.chartData.documented.length > 0
		) {
			const store: Record<string, number> = {}
			for (const { timestamp, ...rest } of unlocksAndIncentivesData.chartData.documented) {
				const dateSec = Math.floor(timestamp / 1e3)
				const dateKey = isWeekly ? lastDayOfWeek(dateSec) : isMonthly ? firstDayOfMonth(dateSec) : dateSec
				let total = 0
				for (const label in rest) {
					const val = rest[label]
					if (val != null) total += val
				}
				store[dateKey] = (store[dateKey] ?? 0) + total
			}
			charts['Unlocks'] = Object.entries(store).map(([date, value]) => [+date * 1e3, value] as [number, number])
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
			const chartData = Object.entries(extraTvlCharts.charts.staking).map(
				([date, value]) => [+date * 1e3, value] as [number, number]
			)
			charts['Staking'] = formatLineChart({ data: chartData, groupBy, dateInMs: true, denominationPriceHistory })
		}
		if (extraTvlCharts.charts.borrowed && isBorrowedTvlToggled) {
			const chartData = Object.entries(extraTvlCharts.charts.borrowed).map(
				([date, value]) => [+date * 1e3, value] as [number, number]
			)
			charts['Borrowed'] = formatLineChart({ data: chartData, groupBy, dateInMs: true, denominationPriceHistory })
		}

		if (medianAPYData)
			charts['Median APY'] = formatLineChart({
				data: medianAPYData.map((item): [number, number] => [+item.date * 1e3, Number(item.medianAPY) || 0]),
				groupBy,
				dateInMs: true,
				denominationPriceHistory: null
			})

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
			charts['Total Proposals'] = Object.entries(totalProposals).map(
				([date, value]) => [+date * 1e3, value] as [number, number]
			)
			charts['Successful Proposals'] = Object.entries(successfulProposals).map(
				([date, value]) => [+date * 1e3, value] as [number, number]
			)
			charts['Max Votes'] = Object.entries(maxVotes).map(([date, value]) => [+date * 1e3, value] as [number, number])
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
				data: activeAddressesData.map((item): [number, number] => [item[0], item[1]]),
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		if (newAddressesData && isNewAddressesToggled)
			charts['New Addresses'] = formatBarChart({
				data: newAddressesData.map((item): [number, number] => [item[0], item[1]]),
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		if (transactionsData && isTransactionsToggled)
			charts['Transactions'] = formatBarChart({
				data: transactionsData.map((item): [number, number] => [item[0], item[1]]),
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

		const filteredCharts = Object.fromEntries(
			Object.entries(charts).filter(([chartLabel]) => {
				const queryParamKey = protocolCharts[chartLabel as ProtocolChartsLabels]
				return queryParamKey ? toggledMetrics[queryParamKey] === 'true' : true
			})
		) as Record<string, Array<[number, number | null]>>

		return { finalCharts: filteredCharts, valueSymbol, loadingCharts: '' }
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
		fetchingPool2TvlChart,
		fetchingStakingTvlChart,
		fetchingBorrowedTvlChart,
		fetchingDoubleCountedTvlChart,
		fetchingLiquidStakingTvlChart,
		fetchingVestingTvlChart,
		fetchingGovTokensTvlChart,
		fetchingFees,
		feesDataChart,
		fetchingRevenue,
		revenueDataChart,
		fetchingHoldersRevenue,
		holdersRevenueDataChart,
		fetchingBribes,
		bribesDataChart,
		fetchingTokenTaxes,
		tokenTaxesDataChart,
		fetchingDexVolume,
		dexVolumeDataChart,
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
		fetchingGovernanceData,
		governanceData,
		fetchingNftVolume,
		nftVolumeData,
		fetchingBridgeVolume,
		bridgeVolumeData,
		isTvlToggled,
		isTotalAssetsToggled,
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
		isTreasuryToggled,
		isUsdInflowsToggled,
		isBridgeVolumeToggled,
		toggledMetrics,
		groupBy,
		extraTvlCharts,
		valueSymbol,
		isCEX
	])

	return chartData
}
