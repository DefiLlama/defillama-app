import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { CACHE_SERVER, CHAINS_ASSETS_CHART, RAISES_API } from '~/constants'
import { useGetBridgeChartDataByChain } from '~/containers/Bridges/queries.client'
import { getAdapterChainChartData, getAdapterProtocolChartData } from '~/containers/DimensionAdapters/api'
import {
	useFetchProtocolActiveUsers,
	useFetchProtocolNewUsers,
	useFetchProtocolTransactions
} from '~/containers/ProtocolOverview/queries.client'
import { useGetStabelcoinsChartDataByChain } from '~/containers/Stablecoins/queries.client'
import { getProtocolUnlockUsdChart } from '~/containers/Unlocks/queries'
import { TVL_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { getPercentChange, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type { ChainChartLabels } from './constants'

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000

/**
 * Get TVL values for 24h change calculation.
 * Finds timestamps that are at least 24 hours apart (not just consecutive entries).
 * Returns null for tvlPrevDay if chart data is stale (last update > 24 hours ago).
 */
const getTvl24hChange = (
	chart: Array<[number, number]>
): { totalValueUSD: number | null; tvlPrevDay: number | null } => {
	if (!chart || chart.length === 0) {
		return { totalValueUSD: null, tvlPrevDay: null }
	}

	const lastEntry = chart[chart.length - 1]
	if (!lastEntry) {
		return { totalValueUSD: null, tvlPrevDay: null }
	}

	const [lastTimestamp, lastValue] = lastEntry
	const now = Date.now()

	// Check if data is stale (last timestamp is more than 24 hours old)
	if (now - lastTimestamp > TWENTY_FOUR_HOURS_IN_MS) {
		return { totalValueUSD: lastValue, tvlPrevDay: null }
	}

	// Find an entry that is at least 24 hours before the last entry
	let tvlPrevDay: number | null = null
	for (let i = chart.length - 2; i >= 0; i--) {
		const [timestamp, value] = chart[i]
		if (lastTimestamp - timestamp >= TWENTY_FOUR_HOURS_IN_MS) {
			tvlPrevDay = value
			break
		}
	}

	return { totalValueUSD: lastValue, tvlPrevDay }
}

export const useFetchChainChartData = ({
	denomination,
	selectedChain,
	tvlChart,
	tvlChartSummary,
	extraTvlCharts,
	tvlSettings,
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
	chainGeckoId?: string
	toggledCharts: Array<ChainChartLabels>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
}) => {
	const toggledChartsSet = useMemo(() => new Set(toggledCharts), [toggledCharts])

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
		mcaps: Array<[number, number]>
		volumes: Array<[number, number]>
	}>({
		queryKey: ['priceHistory', denominationGeckoId],
		queryFn: () =>
			fetchJson(`${CACHE_SERVER}/cgchart/${denominationGeckoId}?fullChart=true`).then((res) => {
				if (!res.data?.prices?.length) return null

				const store = {}
				for (const [date, value] of res.data.prices) {
					store[date] = value
				}

				return { prices: store, mcaps: res.data.mcaps, volumes: res.data.volumes }
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!denominationGeckoId
	})

	const isChainFeesEnabled = toggledChartsSet.has('Chain Fees')
	const { data: chainFeesDataChart = null, isLoading: fetchingChainFees } = useQuery<Array<[number, number]>>({
		queryKey: ['chainFees', selectedChain, isChainFeesEnabled],
		queryFn: () =>
			isChainFeesEnabled
				? getAdapterProtocolChartData({
						adapterType: 'fees',
						protocol: selectedChain
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainFeesEnabled
	})

	const isChainRevenueEnabled = toggledChartsSet.has('Chain Revenue')
	const { data: chainRevenueDataChart = null, isLoading: fetchingChainRevenue } = useQuery<Array<[number, number]>>({
		queryKey: ['chainRevenue', selectedChain, isChainRevenueEnabled],
		queryFn: () =>
			isChainRevenueEnabled
				? getAdapterProtocolChartData({
						adapterType: 'fees',
						protocol: selectedChain,
						dataType: 'dailyRevenue'
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainRevenueEnabled
	})

	const isDexVolumeEnabled = toggledChartsSet.has('DEXs Volume')
	const { data: dexVolumeDataChart = null, isLoading: fetchingDexVolume } = useQuery<Array<[number, number]>>({
		queryKey: ['dexVolume', selectedChain, isDexVolumeEnabled],
		queryFn: () =>
			isDexVolumeEnabled
				? getAdapterChainChartData({
						chain: selectedChain,
						adapterType: 'dexs'
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isDexVolumeEnabled
	})

	const isPerpsVolumeEnabled = toggledChartsSet.has('Perps Volume')
	const { data: perpsVolumeDataChart = null, isLoading: fetchingPerpVolume } = useQuery<Array<[number, number]>>({
		queryKey: ['perpVolume', selectedChain, isPerpsVolumeEnabled],
		queryFn: () =>
			isPerpsVolumeEnabled
				? getAdapterChainChartData({
						chain: selectedChain,
						adapterType: 'derivatives'
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isPerpsVolumeEnabled
	})

	const isChainAppFeesEnabled = toggledChartsSet.has('App Fees')
	const { data: chainAppFeesDataChart = null, isLoading: fetchingChainAppFees } = useQuery<Array<[number, number]>>({
		queryKey: ['chainAppFees', selectedChain, isChainAppFeesEnabled],
		queryFn: () =>
			isChainAppFeesEnabled
				? getAdapterChainChartData({
						adapterType: 'fees',
						chain: selectedChain,
						dataType: 'dailyAppFees'
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainAppFeesEnabled
	})

	const isChainAppRevenueEnabled = toggledChartsSet.has('App Revenue')
	const { data: chainAppRevenueDataChart = null, isLoading: fetchingChainAppRevenue } = useQuery<
		Array<[number, number]>
	>({
		queryKey: ['chainAppRevenue', selectedChain, isChainAppRevenueEnabled],
		queryFn: () =>
			isChainAppRevenueEnabled
				? getAdapterChainChartData({
						adapterType: 'fees',
						chain: selectedChain,
						dataType: 'dailyAppRevenue'
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainAppRevenueEnabled
	})

	const { data: stablecoinsChartData = null, isLoading: fetchingStablecoinsChartDataByChain } =
		useGetStabelcoinsChartDataByChain(toggledChartsSet.has('Stablecoins Mcap') ? selectedChain : null)

	const { data: inflowsChartData = null, isLoading: fetchingInflowsChartData } = useGetBridgeChartDataByChain(
		toggledChartsSet.has('Net Inflows') ? selectedChain : null
	)

	const { data: activeAddressesData = null, isLoading: fetchingActiveAddresses } = useFetchProtocolActiveUsers(
		toggledChartsSet.has('Active Addresses') ? `chain$${selectedChain}` : null
	)
	const { data: newAddressesData = null, isLoading: fetchingNewAddresses } = useFetchProtocolNewUsers(
		toggledChartsSet.has('New Addresses') ? `chain$${selectedChain}` : null
	)
	const { data: transactionsData = null, isLoading: fetchingTransactions } = useFetchProtocolTransactions(
		toggledChartsSet.has('Transactions') ? `chain$${selectedChain}` : null
	)

	const isBridgedTvlEnabled = toggledChartsSet.has('Bridged TVL')
	const { data: bridgedTvlData = null, isLoading: fetchingBridgedTvlData } = useQuery({
		queryKey: ['Bridged TVL', selectedChain, isBridgedTvlEnabled],
		queryFn: isBridgedTvlEnabled ? () => fetchJson(`${CHAINS_ASSETS_CHART}/${selectedChain}`) : () => null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isBridgedTvlEnabled
	})

	const isRaisesEnabled = toggledChartsSet.has('Raises')
	const { data: raisesData = null, isLoading: fetchingRaises } = useQuery<Array<[number, number]>>({
		queryKey: ['raisesChart', selectedChain, isRaisesEnabled],
		queryFn: () =>
			isRaisesEnabled
				? fetchJson(`${RAISES_API}`).then((data) => {
						const store = (data?.raises ?? []).reduce(
							(acc, curr) => {
								acc[curr.date] = (acc[curr.date] ?? 0) + +(curr.amount ?? 0)
								return acc
							},
							{} as Record<string, number>
						)
						const chart = []
						for (const date in store) {
							chart.push([+date * 1e3, store[date] * 1e6])
						}
						return chart
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isRaisesEnabled
	})

	const isChainIncentivesEnabled = toggledChartsSet.has('Token Incentives')
	const { data: chainIncentivesData = null, isLoading: fetchingChainIncentives } = useQuery({
		queryKey: ['chainIncentives', selectedChain, isChainIncentivesEnabled],
		queryFn: () =>
			isChainIncentivesEnabled
				? getProtocolUnlockUsdChart(slug(selectedChain))
						.then((chart) => {
							if (!chart) return null
							const nonZeroIndex = chart.findIndex(([_, value]) => value > 0)
							return chart.slice(nonZeroIndex)
						})
						.catch(() => null)
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isChainIncentivesEnabled
	})

	const { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled } = useMemo(() => {
		const toggledTvlSettings = TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])

		if (toggledTvlSettings.length === 0) {
			// Use pre-computed values from server to avoid client-side iteration
			return {
				finalTvlChart: tvlChart,
				totalValueUSD: tvlChartSummary.totalValueUSD,
				valueChange24hUSD: tvlChartSummary.valueChange24hUSD,
				change24h: tvlChartSummary.change24h
			}
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

		// if liquidstaking and doublecounted are toggled, we need to subtract the overlapping tvl so you don't add twice
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

		const { totalValueUSD, tvlPrevDay } = getTvl24hChange(finalTvlChart)
		const valueChange24hUSD = totalValueUSD != null && tvlPrevDay != null ? totalValueUSD - tvlPrevDay : null
		const change24h = totalValueUSD != null && tvlPrevDay != null ? getPercentChange(totalValueUSD, tvlPrevDay) : null
		const isGovTokensEnabled = !!tvlSettings?.govtokens
		return { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled }
	}, [tvlChart, tvlChartSummary, extraTvlCharts, tvlSettings])

	const chartData = useMemo(() => {
		const charts: { [key in ChainChartLabels]?: Array<[number, number]> } = {}

		const loadingCharts = []

		if (fetchingDenominationPriceHistory) {
			loadingCharts.push('Denomination Price')
		}

		if (fetchingChainFees) {
			loadingCharts.push('Chain Fees')
		}

		if (fetchingChainRevenue) {
			loadingCharts.push('Chain Revenue')
		}

		if (fetchingDexVolume) {
			loadingCharts.push('DEXs Volume')
		}
		if (fetchingPerpVolume) {
			loadingCharts.push('Perps Volume')
		}

		if (fetchingChainAppFees) {
			loadingCharts.push('App Fees')
		}

		if (fetchingChainAppRevenue) {
			loadingCharts.push('App Revenue')
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
				loadingCharts: loadingCharts.join(', ').toLowerCase()
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

		if (chainFeesDataChart) {
			const chartName: ChainChartLabels = 'Chain Fees' as const
			charts[chartName] = formatBarChart({
				data: chainFeesDataChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (chainRevenueDataChart) {
			const chartName: ChainChartLabels = 'Chain Revenue' as const
			charts[chartName] = formatBarChart({
				data: chainRevenueDataChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (dexVolumeDataChart) {
			const chartName: ChainChartLabels = 'DEXs Volume' as const
			charts[chartName] = formatBarChart({
				data: dexVolumeDataChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (perpsVolumeDataChart) {
			const chartName: ChainChartLabels = 'Perps Volume' as const
			charts[chartName] = formatBarChart({
				data: perpsVolumeDataChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (chainAppFeesDataChart) {
			const chartName: ChainChartLabels = 'App Fees' as const
			charts[chartName] = formatBarChart({
				data: chainAppFeesDataChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (chainAppRevenueDataChart) {
			const chartName: ChainChartLabels = 'App Revenue' as const
			charts[chartName] = formatBarChart({
				data: chainAppRevenueDataChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (isTokenPriceEnabled && denominationPriceHistory?.prices) {
			const chartName: ChainChartLabels = 'Token Price' as const
			const priceData = []
			for (const date in denominationPriceHistory.prices) {
				priceData.push([+date, denominationPriceHistory.prices[date]])
			}
			charts[chartName] = formatLineChart({
				data: priceData,
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

		if (inflowsChartData) {
			const chartName: ChainChartLabels = 'Net Inflows' as const
			charts[chartName] = formatBarChart({
				data: inflowsChartData,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		if (stablecoinsChartData) {
			const chartName: ChainChartLabels = 'Stablecoins Mcap' as const
			charts[chartName] = formatLineChart({
				data: stablecoinsChartData,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null,
				dateInMs: true
			})
		}

		if (activeAddressesData) {
			const chartName: ChainChartLabels = 'Active Addresses' as const
			charts[chartName] = formatBarChart({
				data: activeAddressesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (newAddressesData) {
			const chartName: ChainChartLabels = 'New Addresses' as const
			charts[chartName] = formatBarChart({
				data: newAddressesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (transactionsData) {
			const chartName: ChainChartLabels = 'Transactions' as const
			charts[chartName] = formatBarChart({
				data: transactionsData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (bridgedTvlData) {
			const finalChainAssetsChart = []
			for (const item of bridgedTvlData) {
				if (!item) continue
				const ts = Math.floor(
					dayjs(item.timestamp * 1000)
						.utc()
						.set('hour', 0)
						.set('minute', 0)
						.set('second', 0)
						.toDate()
						.getTime() / 1000
				)
				if (isGovTokensEnabled && item.data.ownTokens) {
					finalChainAssetsChart.push([ts, +item.data.total + +item.data.ownTokens])
				}
				finalChainAssetsChart.push([ts * 1e3, +item.data.total])
			}
			const chartName: ChainChartLabels = 'Bridged TVL' as const
			charts[chartName] = formatLineChart({
				data: finalChainAssetsChart,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null,
				dateInMs: true
			})
		}

		if (raisesData) {
			const chartName: ChainChartLabels = 'Raises' as const
			charts[chartName] = formatBarChart({
				data: raisesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (chainIncentivesData) {
			const chartName: ChainChartLabels = 'Token Incentives' as const
			charts[chartName] = formatLineChart({
				data: chainIncentivesData,
				groupBy,
				denominationPriceHistory: isDenominationEnabled ? denominationPriceHistory?.prices : null
			})
		}

		return {
			finalCharts: charts,
			valueSymbol: denomination === 'USD' ? '$' : denomination,
			loadingCharts: ''
		}
	}, [
		toggledChartsSet,
		isGovTokensEnabled,
		fetchingDenominationPriceHistory,
		isDenominationEnabled,
		denominationPriceHistory,
		fetchingChainFees,
		chainFeesDataChart,
		fetchingChainRevenue,
		chainRevenueDataChart,
		fetchingDexVolume,
		dexVolumeDataChart,
		fetchingPerpVolume,
		perpsVolumeDataChart,
		fetchingChainAppFees,
		chainAppFeesDataChart,
		fetchingChainAppRevenue,
		chainAppRevenueDataChart,
		isTokenPriceEnabled,
		isTokenMcapEnabled,
		isTokenVolumeEnabled,
		fetchingInflowsChartData,
		inflowsChartData,
		fetchingStablecoinsChartDataByChain,
		stablecoinsChartData,
		fetchingActiveAddresses,
		activeAddressesData,
		fetchingNewAddresses,
		newAddressesData,
		fetchingTransactions,
		transactionsData,
		fetchingBridgedTvlData,
		bridgedTvlData,
		fetchingRaises,
		raisesData,
		fetchingChainIncentives,
		chainIncentivesData,
		finalTvlChart,
		denomination,
		groupBy
	])

	return {
		isFetchingChartData: !!chartData.loadingCharts,
		finalCharts: chartData.finalCharts,
		valueSymbol: chartData.valueSymbol,
		totalValueUSD,
		valueChange24hUSD,
		change24h
	}
}

// todo dev metrics, commits charts
