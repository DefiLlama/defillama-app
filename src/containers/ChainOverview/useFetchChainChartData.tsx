import { useRouter } from 'next/router'
import dayjs from 'dayjs'

import {
	useDenominationPriceHistory,
	useFetchProtocolTransactions,
	useFetchProtocolUsers
} from '~/api/categories/protocols/client'
import {
	useGetAppRevenueChartDataByChain,
	useGetChainAssetsChart,
	useGetFeesAndRevenueChartDataByChain,
	useGetItemOverviewByChain,
	useGetVolumeChartDataByChain
} from '~/api/categories/chains/client'
import { useGetStabelcoinsChartDataByChain } from '~/containers/Stablecoins/queries.client'
import { useGetBridgeChartDataByChain } from '~/containers/Bridges/queries.client'
import { useMemo } from 'react'
import { getPercentChange, getPrevTvlFromChart, nearestUtcZeroHour } from '~/utils'

export const useFetchChainChartData = ({
	denomination,
	selectedChain,
	dexsData,
	feesData,
	revenueData,
	appRevenueData,
	stablecoinsData,
	inflowsData,
	userData,
	raisesChart,
	chart,
	extraTvlCharts,
	extraTvlsEnabled,
	devMetricsData,
	chainGeckoId,
	perpsData,
	chainAssets
}) => {
	const router = useRouter()

	const { data: denominationPriceHistory, isLoading: fetchingDenominationPriceHistory } = useDenominationPriceHistory(
		denomination !== 'USD' ||
			router.query.price === 'true' ||
			router.query.chainTokenPrice === 'true' ||
			router.query.chainTokenMcap === 'true' ||
			router.query.chainTokenVolume === 'true'
			? chainGeckoId
			: null
	)

	const { data: dexsChart, isLoading: fetchingVolumeChartDataByChain } = useGetVolumeChartDataByChain(
		dexsData?.total24h && router.query.dexs === 'true' ? selectedChain : null
	)

	const { data: feesAndRevenueChart, isLoading: fetchingFeesAndRevenueChartDataByChain } =
		useGetFeesAndRevenueChartDataByChain(
			feesData?.total24h && (router.query.chainFees === 'true' || router.query.chainRevenue === 'true')
				? selectedChain
				: null
		)

	const { data: appRevenueChart, isLoading: fetchingAppRevenue } = useGetAppRevenueChartDataByChain(
		appRevenueData?.total24h && router.query.appRevenue === 'true' ? selectedChain : null
	)

	const { data: stablecoinsChartData, isLoading: fetchingStablecoinsChartDataByChain } =
		useGetStabelcoinsChartDataByChain(stablecoinsData?.mcap && router.query.stables === 'true' ? selectedChain : null)

	const { data: inflowsChartData, isLoading: fetchingInflowsChartData } = useGetBridgeChartDataByChain(
		inflowsData?.netInflows && router.query.inflows === 'true' ? selectedChain : null
	)

	const { data: usersData, isLoading: fetchingUsersChartData } = useFetchProtocolUsers(
		userData?.activeUsers && router.query.addresses === 'true' ? 'chain$' + selectedChain : null
	)

	const { data: txsData, isLoading: fetchingTransactionsChartData } = useFetchProtocolTransactions(
		userData?.transactions && router.query.txs === 'true' ? 'chain$' + selectedChain : null
	)

	const { data: perpsChart, isLoading: fetchingPerpsChartData } = useGetItemOverviewByChain(
		perpsData?.total24h && router.query.perps === 'true' ? selectedChain : null,
		'derivatives'
	)

	const { data: chainAssetsChart, isLoading: fetchingChainAssetsChart } = useGetChainAssetsChart(
		chainAssets && router.query.chainAssets === 'true' ? selectedChain : null
	)

	const isFetchingChartData =
		fetchingDenominationPriceHistory ||
		fetchingVolumeChartDataByChain ||
		fetchingFeesAndRevenueChartDataByChain ||
		fetchingAppRevenue ||
		fetchingStablecoinsChartDataByChain ||
		fetchingInflowsChartData ||
		fetchingUsersChartData ||
		fetchingTransactionsChartData ||
		fetchingPerpsChartData ||
		fetchingChainAssetsChart

	const globalChart = useMemo(() => {
		const globalChart = (chart ?? []).map((data) => {
			let sum = data[1]
			Object.entries(extraTvlCharts).forEach(([prop, propCharts]: [string, Array<[number, number]>]) => {
				const stakedData = propCharts.find((x) => x[0] === data[0])

				// find current date and only add values on that date in "data" above
				if (stakedData) {
					if (prop === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
						sum -= stakedData[1]
					}

					if (prop === 'liquidstaking' && !extraTvlsEnabled['liquidstaking']) {
						sum -= stakedData[1]
					}

					if (prop === 'dcAndLsOverlap') {
						if (!extraTvlsEnabled['doublecounted'] || !extraTvlsEnabled['liquidstaking']) {
							sum += stakedData[1]
						}
					}

					if (extraTvlsEnabled[prop.toLowerCase()] && prop !== 'doublecounted' && prop !== 'liquidstaking') {
						sum += stakedData[1]
					}
				}
			})
			return [data[0], sum]
		})

		return globalChart
	}, [chart, extraTvlsEnabled, extraTvlCharts])

	const chartDatasets = useMemo(() => {
		const isNonUSDDenomination = denomination !== 'USD' && denominationPriceHistory && chainGeckoId

		const deduplicateTimestamps = (data) => {
			const seenTimestamps = new Set()
			return data?.reduce((acc, [date, value]) => {
				const timestamp = dayjs(Math.floor(date)).utc().startOf('day').unix()
				if (!seenTimestamps.has(timestamp)) {
					seenTimestamps.add(timestamp)
					acc.push([timestamp, value])
				}
				return acc
			}, [])
		}

		const normalizedDenomination = []
		if (isNonUSDDenomination) {
			for (const [timestamp, price] of denominationPriceHistory.prices) {
				const date = dayjs(timestamp).utc().startOf('day').unix()
				normalizedDenomination[date] = price
			}
		}

		const finalTvlChart = isNonUSDDenomination
			? globalChart.map(([date, tvl]) => [date, tvl / normalizedDenomination[date]])
			: globalChart

		const finalDexsChart = isNonUSDDenomination
			? dexsChart?.map(([date, volume]) => [date, volume / normalizedDenomination[date]])
			: dexsChart

		const finalPriceChart = isNonUSDDenomination ? null : deduplicateTimestamps(denominationPriceHistory?.prices)

		const finalMcapChart = isNonUSDDenomination ? null : deduplicateTimestamps(denominationPriceHistory?.mcaps)

		const finalTokenVolumeChart = isNonUSDDenomination ? null : deduplicateTimestamps(denominationPriceHistory?.volumes)

		const finalPerpsChart = isNonUSDDenomination ? null : perpsChart?.totalDataChart

		const finalFeesAndRevenueChart = isNonUSDDenomination
			? feesAndRevenueChart?.map(([date, fees, revenue]) => [
					date,
					fees / normalizedDenomination[date],
					revenue / normalizedDenomination[date]
			  ])
			: feesAndRevenueChart

		const finalAppRevenueChart = isNonUSDDenomination
			? appRevenueChart?.map(([date, revenue]) => [date, revenue / normalizedDenomination[date]])
			: appRevenueChart

		const finalDevsChart = devMetricsData?.report?.monthly_devs?.map(({ k, v }) => [
			Math.floor(nearestUtcZeroHour(dayjs(k).toDate().getTime()) / 1000),
			v
		])

		const finalCommitsChart = devMetricsData?.report?.monthly_devs?.map(({ k, cc }) => [
			Math.floor(nearestUtcZeroHour(dayjs(k).toDate().getTime()) / 1000),
			cc
		])
		const finalChainAssetsChart = chainAssetsChart?.filter(Boolean).map(({ data, timestamp }) => {
			const ts = Math.floor(
				dayjs(timestamp * 1000)
					.utc()
					.set('hour', 0)
					.set('minute', 0)
					.set('second', 0)
					.toDate()
					.getTime() / 1000
			)
			if (!extraTvlsEnabled?.govtokens && data.ownTokens) {
				return [ts, data.total]
			}
			return [ts, data.total + data.ownTokens]
		})

		const chartDatasets = [
			{
				feesChart: finalFeesAndRevenueChart,
				appRevenueChart: finalAppRevenueChart,
				dexsChart: finalDexsChart,
				globalChart: finalTvlChart,
				raisesData: raisesChart,
				totalStablesData: stablecoinsChartData,
				bridgeData: inflowsChartData,
				usersData,
				developersChart: finalDevsChart,
				commitsChart: finalCommitsChart,
				txsData,
				chainTokenPriceData: finalPriceChart?.length ? finalPriceChart : null,
				chainTokenMcapData: finalMcapChart?.length ? finalMcapChart : null,
				chainTokenVolumeData: finalTokenVolumeChart?.length ? finalTokenVolumeChart : null,
				perpsChart: finalPerpsChart,
				chainAssetsData: finalChainAssetsChart
			}
		]

		return chartDatasets
	}, [
		denomination,
		denominationPriceHistory,
		globalChart,
		dexsChart,
		perpsChart?.totalDataChart,
		feesAndRevenueChart,
		appRevenueChart,
		devMetricsData?.report?.monthly_devs,
		chainAssetsChart,
		raisesChart,
		stablecoinsChartData,
		inflowsChartData,
		usersData,
		txsData,
		extraTvlsEnabled?.govtokens,
		chainGeckoId
	])

	const totalValueUSD = getPrevTvlFromChart(globalChart, 0)
	const tvlPrevDay = getPrevTvlFromChart(globalChart, 1)
	const change24h = getPercentChange(totalValueUSD, tvlPrevDay)

	return {
		isFetchingChartData: Object.values(router.query ?? {}).some((q) => q === 'true') && isFetchingChartData,
		chartDatasets,
		totalValueUSD,
		valueChange24hUSD: totalValueUSD - tvlPrevDay,
		change24h
	}
}
