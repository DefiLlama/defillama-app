import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { getProtocolEmissons } from '~/api/categories/protocols'
import {
	useFetchProtocolActiveUsers,
	useFetchProtocolNewUsers,
	useFetchProtocolTransactions
} from '~/api/categories/protocols/client'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { CACHE_SERVER, CHAINS_ASSETS_CHART, RAISES_API } from '~/constants'
import { useGetBridgeChartDataByChain } from '~/containers/Bridges/queries.client'
import { getAdapterChainChartData, getAdapterProtocolChartData } from '~/containers/DimensionAdapters/queries'
import { useGetStabelcoinsChartDataByChain } from '~/containers/Stablecoins/queries.client'
import { getPercentChange, getPrevTvlFromChart, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { ChainChartLabels } from './constants'

export const useFetchChainChartData = ({
	denomination,
	selectedChain,
	tvlChart,
	extraTvlCharts,
	tvlSettings,
	chainGeckoId,
	toggledCharts,
	groupBy
}: {
	denomination: string
	selectedChain: string
	tvlChart: Array<[number, number]>
	extraTvlCharts: Record<string, Record<string, number>>
	tvlSettings: Record<string, boolean>
	chainGeckoId?: string
	toggledCharts: Array<ChainChartLabels>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
}) => {
	const denominationGeckoId =
		denomination !== 'USD' ||
		toggledCharts.includes('Token Price') ||
		toggledCharts.includes('Token Mcap') ||
		toggledCharts.includes('Token Volume')
			? chainGeckoId
			: null

	const isDenominationEnabled = denomination !== 'USD' && chainGeckoId ? true : false
	const isTokenPriceEnabled = toggledCharts.includes('Token Price') ? true : false
	const isTokenMcapEnabled = toggledCharts.includes('Token Mcap') ? true : false
	const isTokenVolumeEnabled = toggledCharts.includes('Token Volume') ? true : false

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
		enabled: denominationGeckoId ? true : false
	})

	const isChainFeesEnabled = toggledCharts.includes('Chain Fees') ? true : false
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

	const isChainRevenueEnabled = toggledCharts.includes('Chain Revenue') ? true : false
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

	const isDexVolumeEnabled = toggledCharts.includes('DEXs Volume') ? true : false
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

	const isPerpsVolumeEnabled = toggledCharts.includes('Perps Volume') ? true : false
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

	const isChainAppFeesEnabled = toggledCharts.includes('App Fees') ? true : false
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

	const isChainAppRevenueEnabled = toggledCharts.includes('App Revenue') ? true : false
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
		useGetStabelcoinsChartDataByChain(toggledCharts.includes('Stablecoins Mcap') ? selectedChain : null)

	const { data: inflowsChartData = null, isLoading: fetchingInflowsChartData } = useGetBridgeChartDataByChain(
		toggledCharts.includes('Net Inflows') ? selectedChain : null
	)

	const { data: activeAddressesData = null, isLoading: fetchingActiveAddresses } = useFetchProtocolActiveUsers(
		toggledCharts.includes('Active Addresses') ? `chain$${selectedChain}` : null
	)
	const { data: newAddressesData = null, isLoading: fetchingNewAddresses } = useFetchProtocolNewUsers(
		toggledCharts.includes('New Addresses') ? `chain$${selectedChain}` : null
	)
	const { data: transactionsData = null, isLoading: fetchingTransactions } = useFetchProtocolTransactions(
		toggledCharts.includes('Transactions') ? `chain$${selectedChain}` : null
	)

	const isBridgedTvlEnabled = toggledCharts.includes('Bridged TVL') ? true : false
	const { data: bridgedTvlData = null, isLoading: fetchingBridgedTvlData } = useQuery({
		queryKey: ['Bridged TVL', selectedChain, isBridgedTvlEnabled],
		queryFn: isBridgedTvlEnabled ? () => fetchJson(`${CHAINS_ASSETS_CHART}/${selectedChain}`) : () => null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isBridgedTvlEnabled
	})

	const isRaisesEnabled = toggledCharts.includes('Raises') ? true : false
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

	const isChainIncentivesEnabled = toggledCharts.includes('Token Incentives') ? true : false
	const { data: chainIncentivesData = null, isLoading: fetchingChainIncentives } = useQuery({
		queryKey: ['chainIncentives', selectedChain, isChainIncentivesEnabled],
		queryFn: () =>
			isChainIncentivesEnabled
				? getProtocolEmissons(slug(selectedChain))
						.then((data) => data?.unlockUsdChart ?? null)
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
		const toggledTvlSettings = Object.entries(tvlSettings)
			.filter(([key, value]) => value)
			.map(([key]) => key)

		if (toggledTvlSettings.length === 0) {
			const totalValueUSD = getPrevTvlFromChart(tvlChart, 0)
			const tvlPrevDay = getPrevTvlFromChart(tvlChart, 1)
			const valueChange24hUSD = totalValueUSD - tvlPrevDay
			const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
			return { finalTvlChart: tvlChart, totalValueUSD, valueChange24hUSD, change24h }
		}

		const store: Record<string, number> = {}
		for (const [date, tvl] of tvlChart) {
			let sum = tvl
			for (const toggledTvlSetting of toggledTvlSettings) {
				sum += extraTvlCharts[toggledTvlSetting]?.[date] ?? 0
			}
			store[date] = sum
		}

		// if liquidstaking and doublecounted are toggled, we need to subtract the overlapping tvl so you don't add twice
		if (toggledTvlSettings.includes('liquidstaking') && toggledTvlSettings.includes('doublecounted')) {
			for (const date in store) {
				store[date] -= extraTvlCharts['dcAndLsOverlap']?.[date] ?? 0
			}
		}

		const finalTvlChart = []
		for (const date in store) {
			finalTvlChart.push([+date, store[date]])
		}

		const totalValueUSD = getPrevTvlFromChart(finalTvlChart, 0)
		const tvlPrevDay = getPrevTvlFromChart(finalTvlChart, 1)
		const valueChange24hUSD = totalValueUSD - tvlPrevDay
		const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
		const isGovTokensEnabled = tvlSettings?.govtokens ? true : false
		return { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled }
	}, [tvlChart, extraTvlCharts, tvlSettings])

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

		if (toggledCharts.includes('TVL')) {
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
		toggledCharts,
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
		isFetchingChartData: chartData.loadingCharts ? true : false,
		finalCharts: chartData.finalCharts,
		valueSymbol: chartData.valueSymbol,
		totalValueUSD,
		valueChange24hUSD,
		change24h
	}
}

// todo dev metrics, commits charts
