import { useRouter } from 'next/router'
import { IDenominationPriceHistory, IProtocolOverviewPageData } from '../types'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { ProtocolChartsLabels } from './constants'
import { getAdapterProtocolSummary, IAdapterSummary } from '~/containers/DimensionAdapters/queries'
import { useQuery } from '@tanstack/react-query'
import { firstDayOfMonth, lastDayOfWeek, nearestUtcZeroHour, slug } from '~/utils'
import { CACHE_SERVER, NFT_MARKETPLACES_VOLUME_API, PROTOCOL_TREASURY_API, TOKEN_LIQUIDITY_API } from '~/constants'
import { getProtocolEmissons } from '~/api/categories/protocols'
import {
	useFetchProtocolActiveUsers,
	useFetchProtocolDevMetrics,
	useFetchProtocolGovernanceData,
	useFetchProtocolMedianAPY,
	useFetchProtocolNewUsers,
	useFetchProtocolTransactions,
	useFetchProtocolTreasury
} from '~/api/categories/protocols/client'
import { fetchWithTimeout } from '~/utils/async'

const ProtocolLineBarChart = dynamic(() => import('./Chart2'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<any>

export function ProtocolChart2(props: IProtocolOverviewPageData) {
	const router = useRouter()
	const [isThemeDark] = useDarkModeManager()
	const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly' | 'cumulative'>('daily')

	const toggledMetrics = useMemo(() => {
		const toggled = {
			...router.query,
			...((!props.metrics.tvl
				? props.metrics.dexs
					? { dexVolume: router.query.dexVolume === 'false' ? 'false' : 'true' }
					: props.metrics.perps
					? { perpVolume: router.query.perpVolume === 'false' ? 'false' : 'true' }
					: props.metrics.options
					? {
							optionsPremiumVolume: router.query.optionsPremiumVolume === 'false' ? 'false' : 'true',
							optionsNotionalVolume: router.query.optionsNotionalVolume === 'false' ? 'false' : 'true'
					  }
					: props.metrics.dexAggregators
					? { dexAggregatorVolume: router.query.dexAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.bridgeAggregators
					? { bridgeAggregatorVolume: router.query.bridgeAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.perpsAggregators
					? { perpAggregatorVolume: router.query.perpAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.bridge
					? { bridgeVolume: router.query.bridgeVolume === 'false' ? 'false' : 'true' }
					: props.metrics.fees
					? {
							fees: router.query.fees === 'false' ? 'false' : 'true'
					  }
					: props.metrics.revenue
					? {
							revenue: router.query.revenue === 'false' ? 'false' : 'true',
							holdersRevenue: router.query.holdersRevenue === 'false' ? 'false' : 'true'
					  }
					: props.metrics.unlocks
					? { unlocks: router.query.unlocks === 'false' ? 'false' : 'true' }
					: props.metrics.treasury
					? { treasury: router.query.treasury === 'false' ? 'false' : 'true' }
					: {}
				: {}) as Record<string, string>)
		}

		return {
			...toggled,
			tvl: router.query.tvl === 'false' ? 'false' : 'true',
			events: router.query.events === 'false' ? 'false' : 'true'
		} as any
	}, [router, props.metrics])

	const { finalCharts, valueSymbol, loadingCharts } = useFetchAndFormatChartData({
		...props,
		toggledMetrics,
		groupBy
	})

	return (
		<div className="flex flex-col min-h-[360px]">
			{loadingCharts ? (
				<p className="text-center text-xs my-auto min-h-[360px] flex flex-col items-center justify-center">
					fetching {loadingCharts}...
				</p>
			) : (
				<ProtocolLineBarChart
					chartData={finalCharts}
					chartColors={props.chartColors}
					color={props.pageStyles['--primary-color']}
					isThemeDark={isThemeDark}
					valueSymbol={valueSymbol}
					groupBy={groupBy}
					hallmarks={props.hallmarks}
					unlockTokenSymbol={props.token.symbol}
				/>
			)}
		</div>
	)
}

export const useFetchAndFormatChartData = ({
	name,
	id: protocolId,
	geckoId,
	currentTvlByChain,
	tvlChartData,
	extraTvlCharts,
	metrics,
	toggledMetrics,
	chartDenominations,
	groupBy,
	governanceApis
}: IProtocolOverviewPageData & {
	toggledMetrics: Record<string, string>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
}) => {
	const router = useRouter()
	const isRouterReady = router.isReady
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const denominationGeckoId =
		isRouterReady && toggledMetrics.denomination
			? chartDenominations.find((d) => d.symbol === toggledMetrics.denomination)?.geckoId
			: null
	// date in the chart is in ms
	const { data: denominationPriceHistory = null, isLoading: fetchingDenominationPriceHistory } =
		useQuery<IDenominationPriceHistory>({
			queryKey: ['priceHistory', denominationGeckoId],
			queryFn: () =>
				fetch(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`)
					.then((r) => r.json())
					.then((res) => (res.data.prices.length > 0 ? res.data : { prices: [], mcaps: [], volumes: [] })),
			staleTime: 60 * 60 * 1000,
			retry: 0,
			enabled: denominationGeckoId ? true : false
		})

	// date in the chart is in ms
	const { data: protocolTokenData = null, isLoading: fetchingProtocolTokenData } = useQuery<IDenominationPriceHistory>({
		queryKey: ['priceHistory', geckoId],
		queryFn: () =>
			fetch(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`)
				.then((r) => r.json())
				.then((res) => (res.data.prices.length > 0 ? res.data : { prices: [], mcaps: [], volumes: [] })),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled:
			isRouterReady &&
			(toggledMetrics.mcap === 'true' ||
				toggledMetrics.tokenPrice === 'true' ||
				toggledMetrics.tokenVolume === 'true' ||
				toggledMetrics.fdv === 'true') &&
			geckoId
				? true
				: false
	})

	const { data: tokenTotalSupply = null, isLoading: fetchingTokenTotalSupply } = useQuery({
		queryKey: ['tokenSupply', geckoId],
		queryFn: () =>
			fetch(`${CACHE_SERVER}/supply/${geckoId}`)
				.then((res) => res.json())
				.then((res) => res.data?.['total_supply']),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: geckoId && toggledMetrics.fdv === 'true' && isRouterReady ? true : false
	})

	const { data: tokenLiquidityData = null, isLoading: fetchingTokenLiquidity } = useQuery({
		queryKey: ['tokenLiquidity', protocolId],
		queryFn: () =>
			fetch(`${TOKEN_LIQUIDITY_API}/${protocolId.replaceAll('#', '$')}`)
				.then((res) => res.json())
				.catch(() => null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isRouterReady && metrics.liquidity && toggledMetrics.tokenLiquidity === 'true' ? true : false
	})

	const tvlChart = useMemo(() => {
		const extraTvls = []

		for (const extra in tvlSettings) {
			if (tvlSettings[extra] && currentTvlByChain?.[extra] != null) {
				extraTvls.push(extra)
			}
		}

		if (extraTvls.length > 0) {
			const store = {}
			const isWeekly = groupBy === 'weekly'
			const isMonthly = groupBy === 'monthly'
			for (const [date, value] of tvlChartData) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				store[dateKey] = value + extraTvls.reduce((acc, curr) => acc + (extraTvlCharts?.[curr]?.[dateKey] ?? 0), 0)
			}
			const finalChart = []
			for (const date in store) {
				finalChart.push([+date * 1e3, store[date]])
			}
			return finalChart as Array<[number, number]>
		}

		return formatLineChart({ data: tvlChartData, groupBy })
	}, [tvlChartData, extraTvlCharts, tvlSettings, groupBy])

	const { data: feesData = null, isLoading: fetchingFees } = useQuery<IAdapterSummary>({
		queryKey: ['fees', name],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'fees',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.fees === 'true' && metrics.fees && isRouterReady ? true : false
	})

	const { data: revenueData = null, isLoading: fetchingRevenue } = useQuery<IAdapterSummary>({
		queryKey: ['revenue', name],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'fees',
				dataType: 'dailyRevenue',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.revenue === 'true' && metrics.revenue && isRouterReady ? true : false
	})

	const { data: holdersRevenueData = null, isLoading: fetchingHoldersRevenue } = useQuery<IAdapterSummary>({
		queryKey: ['holders-revenue', name],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'fees',
				dataType: 'dailyHoldersRevenue',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled:
			toggledMetrics.holdersRevenue === 'true' && (metrics.fees || metrics.revenue) && isRouterReady ? true : false
	})

	const { data: bribesData = null, isLoading: fetchingBribes } = useQuery<IAdapterSummary>({
		queryKey: ['bribes', name],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'fees',
				dataType: 'dailyBribesRevenue',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled:
			(toggledMetrics.fees === 'true' ||
				toggledMetrics.revenue === 'true' ||
				toggledMetrics.holdersRevenue === 'true') &&
			feesSettings?.bribes &&
			metrics.bribes &&
			isRouterReady
				? true
				: false
	})

	const { data: tokenTaxesData = null, isLoading: fetchingTokenTaxes } = useQuery<IAdapterSummary>({
		queryKey: ['token-taxes', name],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'fees',
				dataType: 'dailyTokenTaxes',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled:
			(toggledMetrics.fees === 'true' ||
				toggledMetrics.revenue === 'true' ||
				toggledMetrics.holdersRevenue === 'true') &&
			feesSettings?.tokentax &&
			metrics.tokenTax &&
			isRouterReady
				? true
				: false
	})

	const { data: dexVolumeData = null, isLoading: fetchingDexVolume } = useQuery<IAdapterSummary>({
		queryKey: ['dexVolume', name],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'dexs',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.dexVolume === 'true' && metrics.dexs && isRouterReady ? true : false
	})

	const { data: perpsVolumeData = null, isLoading: fetchingPerpVolume } = useQuery<IAdapterSummary>({
		queryKey: ['perpVolume', name],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'derivatives',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.perpVolume === 'true' && metrics.perps && isRouterReady ? true : false
	})

	const { data: optionsPremiumVolumeData = null, isLoading: fetchingOptionsPremiumVolume } = useQuery<IAdapterSummary>({
		queryKey: ['optionsPremiumVolume', name],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'options',
				dataType: 'dailyPremiumVolume',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.optionsPremiumVolume === 'true' && metrics.options && isRouterReady ? true : false
	})

	const { data: optionsNotionalVolumeData = null, isLoading: fetchingOptionsNotionalVolume } =
		useQuery<IAdapterSummary>({
			queryKey: ['optionsNotionalVolume', name],
			queryFn: () =>
				getAdapterProtocolSummary({
					adapterType: 'options',
					dataType: 'dailyNotionalVolume',
					protocol: name,
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
				}),
			staleTime: 60 * 60 * 1000,
			retry: 0,
			enabled: toggledMetrics.optionsNotionalVolume === 'true' && metrics.options && isRouterReady ? true : false
		})

	const { data: dexAggregatorsVolumeData = null, isLoading: fetchingDexAggregatorVolume } = useQuery<IAdapterSummary>({
		queryKey: ['dexAggregatorVolume'],
		queryFn: () =>
			getAdapterProtocolSummary({
				adapterType: 'aggregators',
				protocol: name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.dexAggregatorVolume === 'true' && metrics.dexAggregators && isRouterReady ? true : false
	})

	const { data: perpsAggregatorsVolumeData = null, isLoading: fetchingPerpAggregatorVolume } =
		useQuery<IAdapterSummary>({
			queryKey: ['perpAggregatorVolume', name],
			queryFn: () =>
				getAdapterProtocolSummary({
					adapterType: 'derivatives-aggregator',
					protocol: name,
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
				}),
			staleTime: 60 * 60 * 1000,
			retry: 0,
			enabled:
				toggledMetrics.perpAggregatorVolume === 'true' && metrics.perpsAggregators && isRouterReady ? true : false
		})

	const { data: bridgeAggregatorsVolumeData = null, isLoading: fetchingBridgeAggregatorVolume } =
		useQuery<IAdapterSummary>({
			queryKey: ['bridgeAggregatorVolume', name],
			queryFn: () =>
				getAdapterProtocolSummary({
					adapterType: 'bridge-aggregators',
					protocol: name,
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
				}),
			staleTime: 60 * 60 * 1000,
			retry: 0,
			enabled:
				toggledMetrics.bridgeAggregatorVolume === 'true' && metrics.bridgeAggregators && isRouterReady ? true : false
		})

	const { data: unlocksAndIncentivesData = null, isLoading: fetchingUnlocksAndIncentives } = useQuery({
		queryKey: ['unlocks', name],
		queryFn: () => getProtocolEmissons(slug(name)),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.unlocks === 'true' && metrics.unlocks && isRouterReady ? true : false
	})

	const { data: treasuryData = null, isLoading: fetchingTreasury } = useQuery({
		queryKey: ['treasury', name],
		queryFn: () =>
			fetch(`${PROTOCOL_TREASURY_API}/${slug(name)}`)
				.then((res) => res.json())
				.then((data) => {
					const store = {}
					for (const chain in data.chainTvls) {
						if (chain.includes('-')) continue
						for (const item of data.chainTvls[chain].tvl ?? []) {
							store[item.date] = (store[item.date] ?? 0) + (item.totalLiquidityUSD ?? 0)
						}
					}
					const finalChart = []
					for (const date in store) {
						finalChart.push([+date * 1e3, store[date]])
					}
					return finalChart
				}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: metrics.treasury && toggledMetrics.treasury === 'true' && isRouterReady ? true : false
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
	// const { data: gasData, isLoading: fetchingGasUsed } = useFetchProtocolGasUsed(
	// 	isRouterReady && toggledMetrics.gasUsed === 'true' && metrics.activeUsers ? protocolId : null
	// )

	const { data: governanceData = null, isLoading: fetchingGovernanceData } = useFetchProtocolGovernanceData(
		isRouterReady && toggledMetrics.governance === 'true' && governanceApis && governanceApis.length > 0
			? governanceApis
			: null
	)

	const { data: devMetricsData = null, isLoading: fetchingDevMetrics } = useFetchProtocolDevMetrics(
		isRouterReady &&
			[
				toggledMetrics.devMetrics,
				toggledMetrics.contributersMetrics,
				toggledMetrics.contributersCommits,
				toggledMetrics.devCommits
			].some((v) => v === 'true')
			? protocolId
			: null
	)

	const { data: nftVolumeData = null, isLoading: fetchingNftVolume } = useQuery({
		queryKey: ['nftVolume', name],
		queryFn: () =>
			fetchWithTimeout(NFT_MARKETPLACES_VOLUME_API, 10_000)
				.then((r) => r.json())
				.then((r) => {
					const chartByDate = r
						.filter((r) => slug(r.exchangeName) === slug(name))
						.map(({ day, sumUsd }) => {
							return [new Date(day).getTime(), sumUsd]
						})
					return chartByDate
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.nftVolume === 'true' && metrics.nfts && isRouterReady ? true : false
	})

	const showNonUsdDenomination =
		toggledMetrics.denomination &&
		toggledMetrics.denomination !== 'USD' &&
		chartDenominations.find((d) => d.symbol === toggledMetrics.denomination) &&
		denominationPriceHistory?.prices?.length > 0
			? true
			: false

	const valueSymbol = showNonUsdDenomination
		? chartDenominations.find((d) => d.symbol === toggledMetrics.denomination)?.symbol ?? ''
		: '$'

	const chartData = useMemo(() => {
		const loadingCharts = []

		if (fetchingProtocolTokenData) {
			loadingCharts.push('Mcap, Token price, Token volume')
		}

		if (fetchingTokenTotalSupply) {
			loadingCharts.push('Token Supply')
		}

		if (fetchingTokenLiquidity) {
			loadingCharts.push('Token Liquidity')
		}

		if (fetchingFees) {
			loadingCharts.push('Fees')
		}

		if (fetchingRevenue) {
			loadingCharts.push('Revenue')
		}

		if (fetchingHoldersRevenue) {
			loadingCharts.push('Holders Revenue')
		}

		if (fetchingBribes) {
			loadingCharts.push('Bribes')
		}

		if (fetchingTokenTaxes) {
			loadingCharts.push('Token Taxes')
		}

		if (fetchingDexVolume) {
			loadingCharts.push('DEX Volume')
		}
		if (fetchingPerpVolume) {
			loadingCharts.push('Perp Volume')
		}
		if (fetchingOptionsPremiumVolume) {
			loadingCharts.push('Options Premium Volume')
		}
		if (fetchingOptionsNotionalVolume) {
			loadingCharts.push('Options Notional Volume')
		}
		if (fetchingDexAggregatorVolume) {
			loadingCharts.push('DEX Aggregator Volume')
		}
		if (fetchingPerpAggregatorVolume) {
			loadingCharts.push('Perp Aggregator Volume')
		}
		if (fetchingBridgeAggregatorVolume) {
			loadingCharts.push('Bridge Aggregator Volume')
		}
		if (fetchingUnlocksAndIncentives) {
			loadingCharts.push('Emissions')
		}
		if (fetchingTreasury) {
			loadingCharts.push('Treasury')
		}
		if (fetchingMedianAPY) {
			loadingCharts.push('Median APY')
		}
		if (fetchingGovernanceData) {
			loadingCharts.push('Governance')
		}
		if (fetchingDevMetrics) {
			loadingCharts.push('Dev Metrics')
		}
		if (fetchingNftVolume) {
			loadingCharts.push('NFT Volume')
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

		if (loadingCharts.length > 0) {
			return { finalCharts: [], stacks: [], valueSymbol, loadingCharts: loadingCharts.join(', ').toLowerCase() }
		}

		const charts: { [key in ProtocolChartsLabels]?: Array<[number, number]> } = {}

		if (tvlChart?.length > 0 && toggledMetrics.tvl === 'true') {
			charts.TVL = tvlChart
		}

		if (protocolTokenData) {
			if (toggledMetrics.mcap === 'true') {
				charts.Mcap = formatLineChart({ data: protocolTokenData.mcaps, groupBy, dateInMs: true })
			}
			if (toggledMetrics.tokenPrice === 'true') {
				charts['Token Price'] = formatLineChart({ data: protocolTokenData.prices, groupBy, dateInMs: true })
			}
			if (toggledMetrics.tokenVolume === 'true') {
				charts['Token Volume'] = formatLineChart({ data: protocolTokenData.volumes, groupBy, dateInMs: true })
			}
			if (toggledMetrics.fdv === 'true') {
				charts['FDV'] = formatLineChart({
					data: protocolTokenData.prices.map(([date, price]) => [date, price * tokenTotalSupply]),
					groupBy,
					dateInMs: true
				})
			}
		}

		if (tokenLiquidityData) {
			charts['Token Liquidity'] = formatLineChart({ data: tokenLiquidityData, groupBy })
		}

		const feesStore = {}
		const revenueStore = {}
		const holdersRevenueStore = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'

		if (feesData) {
			let total = 0
			for (const [date, value] of feesData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				feesStore[dateKey] = (feesStore[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}

		if (revenueData) {
			let total = 0
			for (const [date, value] of revenueData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}

		if (holdersRevenueData) {
			let total = 0
			for (const [date, value] of holdersRevenueData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}

		if (bribesData) {
			let total = 0
			for (const [date, value] of bribesData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				if (feesData) {
					feesStore[dateKey] = (feesStore[dateKey] ?? 0) + value + total
				}
				if (revenueData) {
					revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + value + total
				}
				if (holdersRevenueData) {
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + value + total
				}
				if (isCumulative) {
					total += value
				}
			}
		}

		if (tokenTaxesData) {
			let total = 0
			for (const [date, value] of tokenTaxesData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				if (feesData) {
					feesStore[dateKey] = (feesStore[dateKey] ?? 0) + value + total
				}
				if (revenueData) {
					revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + value + total
				}
				if (holdersRevenueData) {
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + value + total
				}
				if (isCumulative) {
					total += value
				}
			}
		}

		const finalFeesChart = []
		const finalRevenueChart = []
		const finalHoldersRevenueChart = []

		for (const date in feesStore) {
			finalFeesChart.push([+date * 1e3, feesStore[date]])
		}

		for (const date in revenueStore) {
			finalRevenueChart.push([+date * 1e3, revenueStore[date]])
		}

		for (const date in holdersRevenueStore) {
			finalHoldersRevenueChart.push([+date * 1e3, holdersRevenueStore[date]])
		}

		if (finalFeesChart.length > 0) {
			charts.Fees = finalFeesChart
		}

		if (finalRevenueChart.length > 0) {
			charts.Revenue = finalRevenueChart
		}

		if (finalHoldersRevenueChart.length > 0) {
			charts['Holders Revenue'] = finalHoldersRevenueChart
		}

		if (dexVolumeData) {
			charts['DEX Volume'] = formatBarChart({ data: dexVolumeData.totalDataChart, groupBy })
		}

		if (perpsVolumeData) {
			charts['Perp Volume'] = formatBarChart({ data: perpsVolumeData.totalDataChart, groupBy })
		}

		if (optionsPremiumVolumeData) {
			charts['Options Premium Volume'] = formatBarChart({ data: optionsPremiumVolumeData.totalDataChart, groupBy })
		}

		if (optionsNotionalVolumeData) {
			charts['Options Notional Volume'] = formatBarChart({ data: optionsNotionalVolumeData.totalDataChart, groupBy })
		}

		if (dexAggregatorsVolumeData) {
			charts['DEX Aggregator Volume'] = formatBarChart({ data: dexAggregatorsVolumeData.totalDataChart, groupBy })
		}

		if (perpsAggregatorsVolumeData) {
			charts['Perp Aggregator Volume'] = formatBarChart({ data: perpsAggregatorsVolumeData.totalDataChart, groupBy })
		}

		if (bridgeAggregatorsVolumeData) {
			charts['Bridge Aggregator Volume'] = formatBarChart({
				data: bridgeAggregatorsVolumeData.totalDataChart,
				groupBy
			})
		}

		if (unlocksAndIncentivesData?.chartData?.documented.length > 0) {
			const isWeekly = groupBy === 'weekly'
			const isMonthly = groupBy === 'monthly'
			const store = {}
			for (const { date, ...rest } of unlocksAndIncentivesData.chartData.documented) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1000) : isMonthly ? firstDayOfMonth(+date * 1000) : date
				let total = 0
				for (const label in rest) {
					total += rest[label]
				}
				store[dateKey] = (store[dateKey] ?? 0) + total
			}

			const finalChart = []
			for (const date in store) {
				finalChart.push([+date * 1e3, store[date]])
			}

			charts['Unlocks'] = finalChart
		}

		if (unlocksAndIncentivesData?.unlockUsdChart) {
			charts['Incentives'] = formatBarChart({ data: unlocksAndIncentivesData.unlockUsdChart, groupBy })
		}

		if (extraTvlCharts?.staking && toggledMetrics.staking === 'true') {
			const chartData = []
			for (const date in extraTvlCharts.staking) {
				chartData.push([+date * 1e3, extraTvlCharts.staking[date]])
			}
			charts['Staking'] = formatLineChart({ data: chartData, groupBy, dateInMs: true })
		}

		if (extraTvlCharts?.borrowed && toggledMetrics.borrowed === 'true') {
			const chartData = []
			for (const date in extraTvlCharts.borrowed) {
				chartData.push([+date * 1e3, extraTvlCharts.borrowed[date]])
			}
			charts['Borrowed'] = formatLineChart({ data: chartData, groupBy, dateInMs: true })
		}

		if (medianAPYData) {
			charts['Median APY'] = formatLineChart({
				data: medianAPYData.map((item) => [+item.date * 1e3, item.medianAPY]),
				groupBy,
				dateInMs: true
			})
		}

		if (governanceData) {
			const totalProposals = {}
			const successfulProposals = {}
			const maxVotes = {}
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
			const finalTotalProposals = []
			const finalSuccessfulProposals = []
			const finalMaxVotes = []
			for (const date in totalProposals) {
				finalTotalProposals.push([+date * 1e3, totalProposals[date]])
			}
			for (const date in successfulProposals) {
				finalSuccessfulProposals.push([+date * 1e3, successfulProposals[date]])
			}
			for (const date in maxVotes) {
				finalMaxVotes.push([+date * 1e3, maxVotes[date]])
			}
			charts['Total Proposals'] = finalTotalProposals
			charts['Successful Proposals'] = finalSuccessfulProposals
			charts['Max Votes'] = finalMaxVotes
		}

		if (devMetricsData && (toggledMetrics.devMetrics === 'true' || toggledMetrics.devCommits === 'true')) {
			const developers = []
			const commits = []

			const metricKey = groupBy === 'monthly' ? 'monthly_devs' : 'weekly_devs'

			for (const { k, v, cc } of devMetricsData.report?.[metricKey] ?? []) {
				const date = Math.floor(nearestUtcZeroHour(new Date(k).getTime()) / 1000)

				developers.push([+date * 1e3, v])
				commits.push([+date * 1e3, cc])
			}

			if (toggledMetrics.devMetrics === 'true') {
				charts['Developers'] = developers
			}

			if (toggledMetrics.devCommits === 'true') {
				charts['Devs Commits'] = commits
			}
		}

		if (
			devMetricsData &&
			(toggledMetrics.contributersMetrics === 'true' || toggledMetrics.contributersCommits === 'true')
		) {
			const contributers = []
			const commits = []

			const metricKey = groupBy === 'monthly' ? 'monthly_contributers' : 'weekly_contributers'

			for (const { k, v, cc } of devMetricsData.report?.[metricKey] ?? []) {
				const date = Math.floor(nearestUtcZeroHour(new Date(k).getTime()) / 1000)

				contributers.push([+date * 1e3, v])
				commits.push([+date * 1e3, cc])
			}

			if (toggledMetrics.contributersMetrics === 'true') {
				charts['Contributers'] = contributers
			}

			if (toggledMetrics.contributersCommits === 'true') {
				charts['Contributers Commits'] = commits
			}
		}

		if (nftVolumeData && toggledMetrics.nftVolume === 'true') {
			charts['NFT Volume'] = formatBarChart({
				data: nftVolumeData,
				groupBy,
				dateInMs: true
			})
		}

		if (activeAddressesData && toggledMetrics.activeAddresses === 'true') {
			charts['Active Addresses'] = formatLineChart({
				data: activeAddressesData,
				groupBy
			})
		}

		if (newAddressesData && toggledMetrics.newAddresses === 'true') {
			charts['New Addresses'] = formatLineChart({
				data: newAddressesData,
				groupBy
			})
		}

		if (transactionsData && toggledMetrics.transactions === 'true') {
			charts['Transactions'] = formatLineChart({
				data: transactionsData,
				groupBy
			})
		}

		if (treasuryData && toggledMetrics.treasury === 'true') {
			charts['Treasury'] = formatLineChart({
				data: treasuryData,
				groupBy,
				dateInMs: true
			})
		}

		return { finalCharts: charts, valueSymbol, loadingCharts: '' }
	}, [
		toggledMetrics,
		tvlChart,
		fetchingProtocolTokenData,
		protocolTokenData,
		fetchingTokenTotalSupply,
		tokenTotalSupply,
		fetchingTokenLiquidity,
		tokenLiquidityData,
		fetchingFees,
		feesData,
		fetchingRevenue,
		revenueData,
		fetchingHoldersRevenue,
		holdersRevenueData,
		fetchingBribes,
		bribesData,
		fetchingTokenTaxes,
		tokenTaxesData,
		fetchingDexVolume,
		dexVolumeData,
		fetchingPerpVolume,
		perpsVolumeData,
		fetchingOptionsPremiumVolume,
		optionsPremiumVolumeData,
		fetchingOptionsNotionalVolume,
		optionsNotionalVolumeData,
		fetchingDexAggregatorVolume,
		dexAggregatorsVolumeData,
		fetchingPerpAggregatorVolume,
		perpsAggregatorsVolumeData,
		fetchingBridgeAggregatorVolume,
		bridgeAggregatorsVolumeData,
		fetchingUnlocksAndIncentives,
		unlocksAndIncentivesData,
		fetchingTreasury,
		treasuryData,
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
		fetchingDevMetrics,
		devMetricsData,
		fetchingNftVolume,
		nftVolumeData,
		groupBy
	])

	return chartData
}

const formatBarChart = ({
	data,
	groupBy,
	dateInMs = false
}: {
	data: Array<[string | number, number]>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	dateInMs?: boolean
}): Array<[number, number]> => {
	if (['weekly', 'monthly', 'cumulative'].includes(groupBy)) {
		const store = {}
		let total = 0
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'
		for (const [date, value] of data) {
			const dateKey = isWeekly
				? lastDayOfWeek(dateInMs ? +date : +date * 1e3)
				: isMonthly
				? firstDayOfMonth(dateInMs ? +date : +date * 1e3)
				: date
			// sum up values as it is bar chart
			store[dateKey] = (store[dateKey] ?? 0) + value + total
			if (isCumulative) {
				total += value
			}
		}
		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}
	return dateInMs ? (data as Array<[number, number]>) : data.map(([date, value]) => [+date * 1e3, value])
}

const formatLineChart = ({
	data,
	groupBy,
	dateInMs = false
}: {
	data: Array<[string | number, number]>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	dateInMs?: boolean
}): Array<[number, number]> => {
	if (['weekly', 'monthly'].includes(groupBy)) {
		const store = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		for (const [date, value] of data) {
			const dateKey = isWeekly
				? lastDayOfWeek(dateInMs ? +date : +date * 1e3)
				: isMonthly
				? firstDayOfMonth(dateInMs ? +date : +date * 1e3)
				: date
			// do not sum up values, just use the last value for each date
			store[dateKey] = value
		}
		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}
	return dateInMs ? (data as Array<[number, number]>) : data.map(([date, value]) => [+date * 1e3, value])
}

// disabled: tweets, gas used
