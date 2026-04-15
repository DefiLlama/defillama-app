import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import type { DenominationPriceHistory } from '~/api/coingecko.types'
import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { formatBarChart, formatLineChart, getBucketTimestampSec } from '~/components/ECharts/utils'
import { oracleProtocols } from '~/constants'
import { useFetchProtocolGovernanceData } from '~/containers/Governance/queries.client'
import {
	useFetchProtocolActivityChart,
	useFetchProtocolMedianAPY,
	useFetchProtocolTVLChart
} from '~/containers/ProtocolOverview/queries.client'
import type { EmissionsChartRow } from '~/containers/Unlocks/api.types'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { ADAPTER_CHART_DESCRIPTORS_BY_LABEL } from './chartDescriptors'
import { normalizeSeriesToMilliseconds, normalizeSeriesToSeconds } from './chartSeries.utils'
import { protocolCharts, type ProtocolChartsLabels } from './constants'
import type { IProtocolOverviewPageData, IToggledMetrics } from './types'
import { usePrefetchedProtocolChartQuery } from './usePrefetchedProtocolChartQuery'

type ChartInterval = ChartTimeGroupingWithCumulative
type V2ChartPoint = [string | number, number]
/** Maximum allowed difference (in seconds) between chart latest timestamps for alignment. */
const MAX_TVL_TIMESTAMP_ALIGNMENT_DIFF_SEC = 24 * 60 * 60

const getGroupedTimestampSec = (timestampSec: number, groupBy: ChartInterval): number => {
	return groupBy === 'cumulative' ? timestampSec : getBucketTimestampSec(timestampSec, groupBy)
}

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

const buildExtraTvlCharts = (chartByKey: Record<string, Array<V2ChartPoint> | null>): ExtraTvlChartsResult => {
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

		let hasByDate = false
		for (const _date in byDate) {
			hasByDate = true
			break
		}
		if (hasByDate) {
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
	tvlChartData: Array<[number, number]>
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
	const retainedTimestampByKey: Record<string, number> = {}
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
			shouldNormalizeMainTvlLatest && dateInSec === latestMainTvlTimestamp ? mostRecentTvlTimestamp! : dateInSec
		const dateKey = getGroupedTimestampSec(alignedDateInSec, groupBy)
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
		store[String(dateKey)] = value + extrasAtTimestamp
		retainedTimestampByKey[String(dateKey)] = alignedDateInSec
	}

	const finalChart: Array<[number, number | null]> = []
	for (const date in store) {
		const dateInSec = Number(date)
		const dateInMs = Number(date) * 1e3
		const retainedTimestampSec = retainedTimestampByKey[date] ?? dateInSec
		const retainedTimestampMs = retainedTimestampSec * 1e3
		const denominationRate =
			denominationPriceHistory?.[String(retainedTimestampSec)] ??
			denominationPriceHistory?.[String(retainedTimestampMs)]
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

const buildProtocolChartApiUrl = (params: Record<string, string | undefined>) => {
	const searchParams = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value != null) {
			searchParams.set(key, value)
		}
	}
	return `/api/charts/protocol?${searchParams.toString()}`
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

	const denominationGeckoId = isRouterReady ? (selectedDenomination?.geckoId ?? null) : null
	const { data: denominationPriceHistory = null, isLoading: fetchingDenominationPriceHistory } = useQuery<Record<
		string,
		number
	> | null>({
		queryKey: ['protocol-overview', protocolSlug, 'denomination-price-history', denominationGeckoId],
		queryFn: () =>
			fetchJson(`/api/charts/coingecko/${encodeURIComponent(denominationGeckoId!)}?fullChart=true`).then(
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
		useQuery<DenominationPriceHistory | null>({
			queryKey: ['protocol-overview', protocolSlug, 'token-price-history', geckoId],
			queryFn: () =>
				fetchJson(`/api/charts/coingecko/${encodeURIComponent(geckoId!)}?fullChart=true`).then(
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
				`/api/charts/coingecko/${encodeURIComponent(geckoId!)}?kind=supply`
			).then((res) => res.totalSupply ?? null),
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
	const baseTvlChartData = useMemo((): Array<[number, number]> => {
		if (isCEX) {
			return prefetchedChartsInSeconds['Total Assets'] ?? prefetchedChartsInSeconds['TVL'] ?? []
		}
		return prefetchedChartsInSeconds['TVL'] ?? []
	}, [prefetchedChartsInSeconds, isCEX])

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
				tvlChartData: baseTvlChartData,
				extraTvlCharts,
				tvlSettings,
				currentTvlByChain,
				groupBy,
				denominationPriceHistory
			}),
		[baseTvlChartData, extraTvlCharts, tvlSettings, groupBy, denominationPriceHistory, currentTvlByChain]
	)

	const feesDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Fees']
	const revenueDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Revenue']
	const holdersRevenueDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Holders Revenue']
	const dexVolumeDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['DEX Volume']
	const dexNotionalVolumeDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['DEX Notional Volume']
	const perpVolumeDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Perp Volume']
	const openInterestDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Open Interest']
	const optionsPremiumDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Options Premium Volume']
	const optionsNotionalDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Options Notional Volume']
	const dexAggregatorsDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['DEX Aggregator Volume']
	const perpsAggregatorsDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Perp Aggregator Volume']
	const bridgeAggregatorsDescriptor = ADAPTER_CHART_DESCRIPTORS_BY_LABEL['Bridge Aggregator Volume']

	const isFeesEnabled = !!(toggledMetrics.fees === 'true' && metrics.fees && isRouterReady)
	const { data: feesDataChart, isLoading: fetchingFees } = usePrefetchedProtocolChartQuery({
		label: 'Fees',
		prefetchedCharts: prefetchedChartsInSeconds,
		queryKey: ['protocol-overview', protocolSlug, 'fees'],
		enabled: isFeesEnabled,
		queryFn: () =>
			fetchJson(
				buildProtocolChartApiUrl({
					kind: 'adapter',
					adapterType: feesDescriptor!.chartRequest.adapterType,
					protocol: name,
					dataType: feesDescriptor!.chartRequest.dataType
				})
			)
	})

	const isRevenueEnabled = !!(toggledMetrics.revenue === 'true' && metrics.revenue && isRouterReady)
	const { data: revenueDataChart, isLoading: fetchingRevenue } = usePrefetchedProtocolChartQuery({
		label: 'Revenue',
		prefetchedCharts: prefetchedChartsInSeconds,
		queryKey: ['protocol-overview', protocolSlug, 'revenue'],
		enabled: isRevenueEnabled,
		queryFn: () =>
			fetchJson(
				buildProtocolChartApiUrl({
					kind: 'adapter',
					adapterType: revenueDescriptor!.chartRequest.adapterType,
					protocol: name,
					dataType: revenueDescriptor!.chartRequest.dataType
				})
			)
	})

	const isHoldersRevenueEnabled = !!(
		toggledMetrics.holdersRevenue === 'true' &&
		(metrics.fees || metrics.revenue) &&
		isRouterReady
	)
	const { data: holdersRevenueDataChart, isLoading: fetchingHoldersRevenue } = usePrefetchedProtocolChartQuery({
		label: 'Holders Revenue',
		prefetchedCharts: prefetchedChartsInSeconds,
		queryKey: ['protocol-overview', protocolSlug, 'holders-revenue'],
		enabled: isHoldersRevenueEnabled,
		queryFn: () =>
			fetchJson(
				buildProtocolChartApiUrl({
					kind: 'adapter',
					adapterType: holdersRevenueDescriptor!.chartRequest.adapterType,
					protocol: name,
					dataType: holdersRevenueDescriptor!.chartRequest.dataType
				})
			)
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
				? fetchJson(
						buildProtocolChartApiUrl({
							kind: 'adapter',
							adapterType: 'fees',
							dataType: 'dailyBribesRevenue',
							protocol: name
						})
					)
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
				? fetchJson(
						buildProtocolChartApiUrl({
							kind: 'adapter',
							adapterType: 'fees',
							dataType: 'dailyTokenTaxes',
							protocol: name
						})
					)
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isTokenTaxesEnabled
	})

	const isDexVolumeEnabled = !!(toggledMetrics.dexVolume === 'true' && metrics.dexs && isRouterReady)
	const { data: dexVolumeDataChart, isLoading: fetchingDexVolume } = usePrefetchedProtocolChartQuery({
		label: 'DEX Volume',
		prefetchedCharts: prefetchedChartsInSeconds,
		queryKey: ['protocol-overview', protocolSlug, 'dex-volume'],
		enabled: isDexVolumeEnabled,
		queryFn: () =>
			fetchJson(
				buildProtocolChartApiUrl({
					kind: 'adapter',
					adapterType: dexVolumeDescriptor!.chartRequest.adapterType,
					protocol: name,
					dataType: dexVolumeDescriptor!.chartRequest.dataType
				})
			)
	})

	const isDexNotionalVolumeEnabled = !!(
		toggledMetrics.dexNotionalVolume === 'true' &&
		metrics.dexsNotionalVolume &&
		isRouterReady
	)
	const { data: dexNotionalVolumeDataChart, isLoading: fetchingDexNotionalVolume } = usePrefetchedProtocolChartQuery({
		label: 'DEX Notional Volume',
		prefetchedCharts: prefetchedChartsInSeconds,
		queryKey: ['protocol-overview', protocolSlug, 'dex-notional-volume'],
		enabled: isDexNotionalVolumeEnabled,
		queryFn: () =>
			fetchJson(
				buildProtocolChartApiUrl({
					kind: 'adapter',
					adapterType: dexNotionalVolumeDescriptor!.chartRequest.adapterType,
					protocol: name,
					dataType: dexNotionalVolumeDescriptor!.chartRequest.dataType
				})
			)
	})

	const isPerpsVolumeEnabled = !!(toggledMetrics.perpVolume === 'true' && metrics.perps && isRouterReady)
	const { data: perpsVolumeDataChart, isLoading: fetchingPerpVolume } = usePrefetchedProtocolChartQuery({
		label: 'Perp Volume',
		prefetchedCharts: prefetchedChartsInSeconds,
		queryKey: ['protocol-overview', protocolSlug, 'perp-volume'],
		enabled: isPerpsVolumeEnabled,
		queryFn: () =>
			fetchJson(
				buildProtocolChartApiUrl({
					kind: 'adapter',
					adapterType: perpVolumeDescriptor!.chartRequest.adapterType,
					protocol: name,
					dataType: perpVolumeDescriptor!.chartRequest.dataType
				})
			)
	})

	const isOpenInterestEnabled = !!(toggledMetrics.openInterest === 'true' && metrics.openInterest && isRouterReady)
	const { data: openInterestDataChart, isLoading: fetchingOpenInterest } = usePrefetchedProtocolChartQuery({
		label: 'Open Interest',
		prefetchedCharts: prefetchedChartsInSeconds,
		queryKey: ['protocol-overview', protocolSlug, 'open-interest'],
		enabled: isOpenInterestEnabled,
		queryFn: () =>
			fetchJson(
				buildProtocolChartApiUrl({
					kind: 'adapter',
					adapterType: openInterestDescriptor!.chartRequest.adapterType,
					protocol: name,
					dataType: openInterestDescriptor!.chartRequest.dataType
				})
			)
	})

	const isOptionsPremiumVolumeEnabled = !!(
		toggledMetrics.optionsPremiumVolume === 'true' &&
		metrics.optionsPremiumVolume &&
		isRouterReady
	)
	const { data: optionsPremiumVolumeDataChart, isLoading: fetchingOptionsPremiumVolume } =
		usePrefetchedProtocolChartQuery({
			label: 'Options Premium Volume',
			prefetchedCharts: prefetchedChartsInSeconds,
			queryKey: ['protocol-overview', protocolSlug, 'options-premium-volume'],
			enabled: isOptionsPremiumVolumeEnabled,
			queryFn: () =>
				fetchJson(
					buildProtocolChartApiUrl({
						kind: 'adapter',
						adapterType: optionsPremiumDescriptor!.chartRequest.adapterType,
						protocol: name,
						dataType: optionsPremiumDescriptor!.chartRequest.dataType
					})
				)
		})

	const isOptionsNotionalVolumeEnabled = !!(
		toggledMetrics.optionsNotionalVolume === 'true' &&
		metrics.optionsNotionalVolume &&
		isRouterReady
	)
	const { data: optionsNotionalVolumeDataChart, isLoading: fetchingOptionsNotionalVolume } =
		usePrefetchedProtocolChartQuery({
			label: 'Options Notional Volume',
			prefetchedCharts: prefetchedChartsInSeconds,
			queryKey: ['protocol-overview', protocolSlug, 'options-notional-volume'],
			enabled: isOptionsNotionalVolumeEnabled,
			queryFn: () =>
				fetchJson(
					buildProtocolChartApiUrl({
						kind: 'adapter',
						adapterType: optionsNotionalDescriptor!.chartRequest.adapterType,
						protocol: name,
						dataType: optionsNotionalDescriptor!.chartRequest.dataType
					})
				)
		})

	const isDexAggregatorsVolumeEnabled = !!(
		toggledMetrics.dexAggregatorVolume === 'true' &&
		metrics.dexAggregators &&
		isRouterReady
	)
	const { data: dexAggregatorsVolumeDataChart, isLoading: fetchingDexAggregatorVolume } =
		usePrefetchedProtocolChartQuery({
			label: 'DEX Aggregator Volume',
			prefetchedCharts: prefetchedChartsInSeconds,
			queryKey: ['protocol-overview', protocolSlug, 'dex-aggregator-volume'],
			enabled: isDexAggregatorsVolumeEnabled,
			queryFn: () =>
				fetchJson(
					buildProtocolChartApiUrl({
						kind: 'adapter',
						adapterType: dexAggregatorsDescriptor!.chartRequest.adapterType,
						protocol: name,
						dataType: dexAggregatorsDescriptor!.chartRequest.dataType
					})
				)
		})

	const isPerpsAggregatorsVolumeEnabled = !!(
		toggledMetrics.perpAggregatorVolume === 'true' &&
		metrics.perpsAggregators &&
		isRouterReady
	)
	const { data: perpsAggregatorsVolumeDataChart, isLoading: fetchingPerpAggregatorVolume } =
		usePrefetchedProtocolChartQuery({
			label: 'Perp Aggregator Volume',
			prefetchedCharts: prefetchedChartsInSeconds,
			queryKey: ['protocol-overview', protocolSlug, 'perp-aggregator-volume'],
			enabled: isPerpsAggregatorsVolumeEnabled,
			queryFn: () =>
				fetchJson(
					buildProtocolChartApiUrl({
						kind: 'adapter',
						adapterType: perpsAggregatorsDescriptor!.chartRequest.adapterType,
						protocol: name,
						dataType: perpsAggregatorsDescriptor!.chartRequest.dataType
					})
				)
		})

	const isBridgeAggregatorsVolumeEnabled = !!(
		toggledMetrics.bridgeAggregatorVolume === 'true' &&
		metrics.bridgeAggregators &&
		isRouterReady
	)
	const { data: bridgeAggregatorsVolumeDataChart, isLoading: fetchingBridgeAggregatorVolume } =
		usePrefetchedProtocolChartQuery({
			label: 'Bridge Aggregator Volume',
			prefetchedCharts: prefetchedChartsInSeconds,
			queryKey: ['protocol-overview', protocolSlug, 'bridge-aggregator-volume'],
			enabled: isBridgeAggregatorsVolumeEnabled,
			queryFn: () =>
				fetchJson(
					buildProtocolChartApiUrl({
						kind: 'adapter',
						adapterType: bridgeAggregatorsDescriptor!.chartRequest.adapterType,
						protocol: name,
						dataType: bridgeAggregatorsDescriptor!.chartRequest.dataType
					})
				)
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
			tvlChartData: baseTvlChartData,
			extraTvlCharts,
			tvlSettings,
			currentTvlByChain,
			groupBy: 'daily',
			denominationPriceHistory: null
		})
		return buildUsdInflowsFromTvlChart(tvlChartInUsd)
	}, [isUsdInflowsEnabled, baseTvlChartData, extraTvlCharts, tvlSettings, currentTvlByChain])
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

	const showNonUsdDenomination = !!(
		selectedDenomination &&
		selectedDenomination.symbol !== 'USD' &&
		denominationPriceHistory
	)
	const valueSymbol = showNonUsdDenomination ? (selectedDenomination?.symbol ?? '') : '$'

	const chartData = useMemo(() => {
		const loadingStates: ReadonlyArray<{ isLoading: boolean; label: string }> = [
			{ isLoading: !!denominationGeckoId && fetchingDenominationPriceHistory, label: 'Denomination Price History' },
			{
				isLoading:
					(isMcapToggled || isTokenPriceToggled || isTokenVolumeToggled || isFdvToggled) && fetchingProtocolTokenData,
				label: 'Mcap, Token price, Token volume'
			},
			{ isLoading: isFdvToggled && fetchingTokenTotalSupply, label: 'Token Supply' },
			{ isLoading: toggledMetrics.tokenLiquidity === 'true' && fetchingTokenLiquidity, label: 'Token Liquidity' },
			{
				isLoading:
					(shouldFetchPool2Tvl && fetchingPool2TvlChart) ||
					(shouldFetchStakingTvl && fetchingStakingTvlChart) ||
					(shouldFetchBorrowedTvl && fetchingBorrowedTvlChart) ||
					(shouldFetchDoubleCountedTvl && fetchingDoubleCountedTvlChart) ||
					(shouldFetchLiquidStakingTvl && fetchingLiquidStakingTvlChart) ||
					(shouldFetchVestingTvl && fetchingVestingTvlChart) ||
					(shouldFetchGovTokensTvl && fetchingGovTokensTvlChart),
				label: 'TVL Breakdown'
			},
			{ isLoading: isTvsToggled && fetchingTvs, label: 'TVS' },
			{ isLoading: isFeesEnabled && fetchingFees, label: 'Fees' },
			{ isLoading: isRevenueEnabled && fetchingRevenue, label: 'Revenue' },
			{ isLoading: isHoldersRevenueEnabled && fetchingHoldersRevenue, label: 'Holders Revenue' },
			{ isLoading: isBribesEnabled && fetchingBribes, label: 'Bribes' },
			{ isLoading: isTokenTaxesEnabled && fetchingTokenTaxes, label: 'Token Taxes' },
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
			{ isLoading: isUnlocksEnabled && fetchingUnlocksAndIncentives, label: 'Emissions' },
			{ isLoading: isTreasuryToggled && fetchingTreasury, label: 'Treasury' },
			{ isLoading: isUsdInflowsToggled && fetchingUsdInflows, label: 'USD Inflows' },
			{ isLoading: toggledMetrics.medianApy === 'true' && fetchingMedianAPY, label: 'Median APY' },
			{ isLoading: isGovernanceEnabled && fetchingGovernanceData, label: 'Governance' },
			{ isLoading: isNftVolumeToggled && fetchingNftVolume, label: 'NFT Volume' },
			{ isLoading: isActiveAddressesToggled && fetchingActiveAddresses, label: 'Active Addresses' },
			{ isLoading: isNewAddressesToggled && fetchingNewAddresses, label: 'New Addresses' },
			{ isLoading: isTransactionsToggled && fetchingTransactions, label: 'Transactions' },
			{ isLoading: isGasUsedToggled && fetchingGasUsed, label: 'Gas Used' },
			{ isLoading: isBridgeVolumeToggled && fetchingBridgeVolume, label: 'Bridge Volume' }
		]
		const loadingCharts = loadingStates.filter((state) => state.isLoading).map((state) => state.label)
		if (loadingCharts.length > 0) {
			return {
				finalCharts: {} as Record<string, Array<[string | number, number | null]>>,
				valueSymbol,
				loadingCharts: loadingCharts.join(', ').toLowerCase(),
				failedMetrics: [] as ProtocolChartsLabels[]
			}
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
		const isCumulative = groupBy === 'cumulative'
		const applyValue = (date: number, value: number) => {
			if (!denominationPriceHistory) return value
			const price = denominationPriceHistory[String(date)] ?? denominationPriceHistory[String(+date * 1e3)]
			return price ? value / price : null
		}

		if (feesDataChart) {
			let total = 0
			for (const [date, value] of feesDataChart) {
				const dateKey = getGroupedTimestampSec(+date, groupBy)
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
				const dateKey = getGroupedTimestampSec(+date, groupBy)
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
				const dateKey = getGroupedTimestampSec(+date, groupBy)
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
				const dateKey = getGroupedTimestampSec(+date, groupBy)
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
				const dateKey = getGroupedTimestampSec(+date, groupBy)
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
		if (dexNotionalVolumeDataChart)
			charts['DEX Notional Volume'] = formatBarChart({
				data: dexNotionalVolumeDataChart,
				groupBy,
				denominationPriceHistory
			})
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
				const dateKey = getGroupedTimestampSec(dateSec, groupBy)
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
			const stakingChartData = Object.entries(extraTvlCharts.charts.staking).map(
				([date, value]) => [+date * 1e3, value] as [number, number]
			)
			charts['Staking'] = formatLineChart({
				data: stakingChartData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		}
		if (extraTvlCharts.charts.borrowed && isBorrowedTvlToggled) {
			const borrowedChartData = Object.entries(extraTvlCharts.charts.borrowed).map(
				([date, value]) => [+date * 1e3, value] as [number, number]
			)
			charts['Active Loans'] = formatLineChart({
				data: borrowedChartData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
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
			charts['Total Proposals'] = formatBarChart({
				data: Object.entries(totalProposals).map(([date, value]) => [+date, value] as [number, number]),
				groupBy,
				denominationPriceHistory: null
			})
			charts['Successful Proposals'] = formatBarChart({
				data: Object.entries(successfulProposals).map(([date, value]) => [+date, value] as [number, number]),
				groupBy,
				denominationPriceHistory: null
			})
			charts['Max Votes'] = formatLineChart({
				data: Object.entries(maxVotes).map(([date, value]) => [+date, value] as [number, number]),
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
		if (gasUsedData && isGasUsedToggled)
			charts['Gas Used'] = formatBarChart({
				data: gasUsedData.map((item): [number, number] => [item[0], item[1]]),
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

		const failedMetrics = availableCharts.filter((chartLabel) => {
			const queryParamKey = protocolCharts[chartLabel]
			if (!queryParamKey || toggledMetrics[queryParamKey] !== 'true') return false
			return !Object.prototype.hasOwnProperty.call(filteredCharts, chartLabel)
		})

		return { finalCharts: filteredCharts, valueSymbol, loadingCharts: '', failedMetrics }
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
		isBribesEnabled,
		isTokenTaxesEnabled,
		isDexVolumeEnabled,
		isDexNotionalVolumeEnabled,
		isPerpsVolumeEnabled,
		isOpenInterestEnabled,
		isOptionsPremiumVolumeEnabled,
		isOptionsNotionalVolumeEnabled,
		isDexAggregatorsVolumeEnabled,
		isPerpsAggregatorsVolumeEnabled,
		isBridgeAggregatorsVolumeEnabled,
		isUnlocksEnabled,
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
		isGovernanceEnabled,
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
		toggledMetrics,
		groupBy,
		extraTvlCharts,
		availableCharts,
		valueSymbol,
		isCEX
	])

	return chartData
}
