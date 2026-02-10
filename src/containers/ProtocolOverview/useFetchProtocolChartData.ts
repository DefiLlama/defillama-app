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
import { getAdapterProtocolChartData } from '~/containers/DimensionAdapters/queries'
import { useFetchProtocolGovernanceData } from '~/containers/Governance/queries.client'
import {
	useFetchProtocolActiveUsers,
	useFetchProtocolMedianAPY,
	useFetchProtocolNewUsers,
	useFetchProtocolTransactions,
	useFetchProtocolTVLChart
} from '~/containers/ProtocolOverview/queries.client'
import { getProtocolEmissionsCharts } from '~/containers/Unlocks/queries'
import { firstDayOfMonth, lastDayOfWeek, nearestUtcZeroHour, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { ProtocolChartsLabels } from './constants'
import { IDenominationPriceHistory, IProtocolOverviewPageData, IToggledMetrics } from './types'
import { buildProtocolAddlChartsData } from './utils'

type ChartInterval = 'daily' | 'weekly' | 'monthly' | 'cumulative'
type V2ChartPoint = [string | number, number]

const toUnixSeconds = (timestamp: string | number): number | null => {
	const parsed = Number(timestamp)
	if (!Number.isFinite(parsed)) return null
	return parsed >= 1e12 ? Math.floor(parsed / 1e3) : Math.floor(parsed)
}

const buildExtraTvlCharts = (
	chartByKey: Record<string, Array<V2ChartPoint> | null>
): Record<string, Record<string, number>> => {
	const store: Record<string, Record<string, number>> = {}

	for (const key in chartByKey) {
		const chart = chartByKey[key]
		if (!chart || chart.length === 0) continue

		const byDate: Record<string, number> = {}
		for (const [timestamp, value] of chart) {
			const dateInSec = toUnixSeconds(timestamp)
			if (dateInSec == null) continue
			byDate[String(dateInSec)] = value
		}

		if (Object.keys(byDate).length > 0) {
			store[key] = byDate
		}
	}

	return store
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
	extraTvlCharts: Record<string, Record<string, number>>
	tvlSettings: Record<string, boolean>
	currentTvlByChain: Record<string, number> | null
	groupBy: ChartInterval
	denominationPriceHistory: Record<string, number> | null
}): Array<[number, number]> => {
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

	for (const [rawDate, value] of tvlChartData) {
		const dateInSec = toUnixSeconds(rawDate)
		if (dateInSec == null) continue
		const dateKey = isWeekly ? lastDayOfWeek(dateInSec) : isMonthly ? firstDayOfMonth(dateInSec) : dateInSec
		store[String(dateKey)] =
			value + extraTvls.reduce((acc, curr) => acc + (extraTvlCharts[curr]?.[String(dateKey)] ?? 0), 0)
	}

	const finalChart: Array<[number, number]> = []
	for (const date in store) {
		const dateInMs = Number(date) * 1e3
		const denominationRate = denominationPriceHistory?.[String(dateInMs)]
		const finalValue = denominationRate ? store[date] / denominationRate : store[date]
		finalChart.push([dateInMs, finalValue])
	}

	return finalChart
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
	const { data: denominationPriceHistory = null, isLoading: fetchingDenominationPriceHistory } = useQuery<
		Record<string, number>
	>({
		queryKey: ['priceHistory', denominationGeckoId],
		queryFn: () =>
			fetchJson(`${CACHE_SERVER}/cgchart/${denominationGeckoId}?fullChart=true`).then((res) => {
				if (!res.data?.prices?.length) return null
				const store: Record<string, number> = {}
				for (const [date, value] of res.data.prices) {
					store[date] = value
				}
				return store
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!denominationGeckoId
	})

	const { data: protocolTokenData = null, isLoading: fetchingProtocolTokenData } = useQuery<IDenominationPriceHistory>({
		queryKey: ['priceHistory', geckoId],
		queryFn: () =>
			fetchJson(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`).then((res) =>
				res.data.prices.length > 0 ? res.data : { prices: [], mcaps: [], volumes: [] }
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

	const { data: tokenTotalSupply = null, isLoading: fetchingTokenTotalSupply } = useQuery({
		queryKey: ['tokenSupply', geckoId],
		queryFn: () => fetchJson(`${CACHE_SERVER}/supply/${geckoId}`).then((res) => res.data?.['total_supply']),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!(geckoId && toggledMetrics.fdv === 'true' && isRouterReady)
	})

	const { data: tokenLiquidityData = null, isLoading: fetchingTokenLiquidity } = useQuery({
		queryKey: ['tokenLiquidity', protocolId],
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
	const { data: feesDataChart = null, isLoading: fetchingFees } = useQuery<Array<[number, number]>>({
		queryKey: ['fees', name, isFeesEnabled],
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
	const { data: revenueDataChart = null, isLoading: fetchingRevenue } = useQuery<Array<[number, number]>>({
		queryKey: ['revenue', name, isRevenueEnabled],
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
	const { data: holdersRevenueDataChart = null, isLoading: fetchingHoldersRevenue } = useQuery<Array<[number, number]>>(
		{
			queryKey: ['holders-revenue', name, isHoldersRevenueEnabled],
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
		}
	)

	const isBribesEnabled = !!(
		(toggledMetrics.fees === 'true' || toggledMetrics.revenue === 'true' || toggledMetrics.holdersRevenue === 'true') &&
		feesSettings?.bribes &&
		metrics.bribes &&
		isRouterReady
	)
	const { data: bribesDataChart = null, isLoading: fetchingBribes } = useQuery<Array<[number, number]>>({
		queryKey: ['bribes', name, isBribesEnabled],
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
	const { data: tokenTaxesDataChart = null, isLoading: fetchingTokenTaxes } = useQuery<Array<[number, number]>>({
		queryKey: ['token-taxes', name, isTokenTaxesEnabled],
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
	const { data: dexVolumeDataChart = null, isLoading: fetchingDexVolume } = useQuery<Array<[number, number]>>({
		queryKey: ['dexVolume', name, isDexVolumeEnabled],
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
	const { data: perpsVolumeDataChart = null, isLoading: fetchingPerpVolume } = useQuery<Array<[number, number]>>({
		queryKey: ['perpVolume', name, isPerpsVolumeEnabled],
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
	})

	const isOpenInterestEnabled = !!(toggledMetrics.openInterest === 'true' && metrics.openInterest && isRouterReady)
	const { data: openInterestDataChart = null, isLoading: fetchingOpenInterest } = useQuery<Array<[number, number]>>({
		queryKey: ['openInterest', name, isOpenInterestEnabled],
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
	const { data: optionsPremiumVolumeDataChart = null, isLoading: fetchingOptionsPremiumVolume } = useQuery<
		Array<[number, number]>
	>({
		queryKey: ['optionsPremiumVolume', name, isOptionsPremiumVolumeEnabled],
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
	const { data: optionsNotionalVolumeDataChart = null, isLoading: fetchingOptionsNotionalVolume } = useQuery<
		Array<[number, number]>
	>({
		queryKey: ['optionsNotionalVolume', name, isOptionsNotionalVolumeEnabled],
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
	const { data: dexAggregatorsVolumeDataChart = null, isLoading: fetchingDexAggregatorVolume } = useQuery<
		Array<[number, number]>
	>({
		queryKey: ['dexAggregatorVolume', name, isDexAggregatorsVolumeEnabled],
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
	const { data: perpsAggregatorsVolumeDataChart = null, isLoading: fetchingPerpAggregatorVolume } = useQuery<
		Array<[number, number]>
	>({
		queryKey: ['perpAggregatorVolume', name, isPerpsAggregatorsVolumeEnabled],
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
	const { data: bridgeAggregatorsVolumeDataChart = null, isLoading: fetchingBridgeAggregatorVolume } = useQuery<
		Array<[number, number]>
	>({
		queryKey: ['bridgeAggregatorVolume', name, isBridgeAggregatorsVolumeEnabled],
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
	const { data: unlocksAndIncentivesData = null, isLoading: fetchingUnlocksAndIncentives } = useQuery({
		queryKey: ['unlocks', name, isUnlocksEnabled],
		queryFn: () => (isUnlocksEnabled ? getProtocolEmissionsCharts(slug(name)) : Promise.resolve(null)),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isUnlocksEnabled
	})

	const isTreasuryEnabled = !!(toggledMetrics.treasury === 'true' && metrics.treasury && isRouterReady)
	const { data: treasuryData = null, isLoading: fetchingTreasury } = useQuery({
		queryKey: ['treasury', name, isTreasuryEnabled],
		queryFn: () =>
			isTreasuryEnabled
				? fetchJson(`${PROTOCOL_TREASURY_API}/${slug(name)}`).then((data) => {
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
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isTreasuryEnabled
	})

	const isUsdInflowsEnabled = !!(toggledMetrics.usdInflows === 'true' && metrics.tvl && isRouterReady)
	const { data: usdInflowsData = null, isLoading: fetchingUsdInflows } = useQuery({
		queryKey: ['usdInflows', name, isUsdInflowsEnabled, JSON.stringify(tvlSettings)],
		queryFn: () =>
			isUsdInflowsEnabled
				? fetchJson(`https://api.llama.fi/protocol/${slug(name)}`).then((data) => {
						return (
							buildProtocolAddlChartsData({ protocolData: data, extraTvlsEnabled: tvlSettings })?.usdInflows ?? null
						)
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isUsdInflowsEnabled
	})

	const isBridgeVolumeEnabled = !!(toggledMetrics.bridgeVolume === 'true' && isRouterReady)
	const { data: bridgeVolumeData = null, isLoading: fetchingBridgeVolume } = useQuery({
		queryKey: ['bridgeVolume', name, isBridgeVolumeEnabled],
		queryFn: () =>
			isBridgeVolumeEnabled
				? fetchJson(`${BRIDGEVOLUME_API_SLUG}/${slug(name)}`)
						.then((data) => {
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
	const { data: nftVolumeData = null, isLoading: fetchingNftVolume } = useQuery({
		queryKey: ['nftVolume', name, isNftVolumeEnabled],
		queryFn: () =>
			isNftVolumeEnabled
				? fetchJson(NFT_MARKETPLACES_VOLUME_API, { timeout: 10_000 })
						.then((r) =>
							r
								.filter((item) => slug(item.exchangeName) === slug(name))
								.map(({ day, sumUsd }) => [new Date(day).getTime(), sumUsd])
						)
						.catch(() => [])
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
				finalCharts: {} as Record<string, Array<[string | number, number]>>,
				valueSymbol,
				loadingCharts: loadingCharts.join(', ').toLowerCase()
			}
		}

		const charts: { [key in ProtocolChartsLabels]?: Array<[number, number]> } = {}

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
			if (isFdvToggled)
				charts['FDV'] = formatLineChart({
					data: protocolTokenData.prices.map(([date, price]) => [date, price * tokenTotalSupply]),
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
		}
		if (tokenLiquidityData)
			charts['Token Liquidity'] = formatLineChart({ data: tokenLiquidityData, groupBy, denominationPriceHistory })

		const feesStore: Record<string, number> = {}
		const revenueStore: Record<string, number> = {}
		const holdersRevenueStore: Record<string, number> = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'
		const applyValue = (date: number, value: number) =>
			denominationPriceHistory?.[String(+date * 1e3)] ? value / denominationPriceHistory[String(+date * 1e3)] : value

		if (feesDataChart) {
			let total = 0
			for (const [date, value] of feesDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}
		if (revenueDataChart) {
			let total = 0
			for (const [date, value] of revenueDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}
		if (holdersRevenueDataChart) {
			let total = 0
			for (const [date, value] of holdersRevenueDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}
		if (bribesDataChart) {
			let total = 0
			for (const [date, value] of bribesDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				if (feesDataChart) feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				if (revenueDataChart) revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				if (holdersRevenueDataChart)
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}
		if (tokenTaxesDataChart) {
			let total = 0
			for (const [date, value] of tokenTaxesDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				const finalValue = applyValue(+date, value)
				if (feesDataChart) feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				if (revenueDataChart) revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				if (holdersRevenueDataChart)
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) total += finalValue
			}
		}

		const finalFeesChart = Object.entries(feesStore).map(([date, value]) => [+date * 1e3, value] as [number, number])
		const finalRevenueChart = Object.entries(revenueStore).map(
			([date, value]) => [+date * 1e3, value] as [number, number]
		)
		const finalHoldersRevenueChart = Object.entries(holdersRevenueStore).map(
			([date, value]) => [+date * 1e3, value] as [number, number]
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

		if (isUnlocksToggled && unlocksAndIncentivesData?.chartData?.documented.length > 0) {
			const store: Record<string, number> = {}
			for (const { timestamp, ...rest } of unlocksAndIncentivesData.chartData.documented) {
				const dateSec = Math.floor(timestamp / 1e3)
				const dateKey = isWeekly ? lastDayOfWeek(dateSec) : isMonthly ? firstDayOfMonth(dateSec) : dateSec
				let total = 0
				for (const label in rest) total += rest[label]
				store[dateKey] = (store[dateKey] ?? 0) + total
			}
			charts['Unlocks'] = Object.entries(store).map(([date, value]) => [+date * 1e3, value] as [number, number])
		}

		if (isIncentivesToggled && unlocksAndIncentivesData?.unlockUsdChart) {
			const nonZeroIndex = unlocksAndIncentivesData.unlockUsdChart.findIndex(([_, value]) => value > 0)
			charts['Incentives'] = formatBarChart({
				data: unlocksAndIncentivesData.unlockUsdChart.slice(nonZeroIndex),
				groupBy,
				denominationPriceHistory
			})
		}

		if (extraTvlCharts?.staking && isStakingTvlToggled) {
			const chartData = Object.entries(extraTvlCharts.staking).map(
				([date, value]) => [+date * 1e3, value] as [number, number]
			)
			charts['Staking'] = formatLineChart({ data: chartData, groupBy, dateInMs: true, denominationPriceHistory })
		}
		if (extraTvlCharts?.borrowed && isBorrowedTvlToggled) {
			const chartData = Object.entries(extraTvlCharts.borrowed).map(
				([date, value]) => [+date * 1e3, value] as [number, number]
			)
			charts['Borrowed'] = formatLineChart({ data: chartData, groupBy, dateInMs: true, denominationPriceHistory })
		}

		if (medianAPYData)
			charts['Median APY'] = formatLineChart({
				data: medianAPYData.map((item) => [+item.date * 1e3, item.medianAPY]),
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
					const date = Math.floor(nearestUtcZeroHour(+item.date * 1000) / 1000)
					totalProposals[date] = (totalProposals[date] ?? 0) + (item['Total'] || 0)
					successfulProposals[date] = (successfulProposals[date] ?? 0) + (item['Successful'] || 0)
				}
				for (const item of gItem.maxVotes ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+item.date * 1000) / 1000)
					maxVotes[date] = (maxVotes[date] ?? 0) + (item['Max Votes'] || 0)
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

		return { finalCharts: charts, valueSymbol, loadingCharts: '' }
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
		groupBy,
		extraTvlCharts,
		valueSymbol,
		isCEX
	])

	return chartData
}
