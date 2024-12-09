import { useRouter } from 'next/router'
import dayjs from 'dayjs'

import {
	useDenominationPriceHistory,
	useFetchProtocolTransactions,
	useFetchProtocolUsers
} from '~/api/categories/protocols/client'
import {
	useGetChainAssetsChart,
	useGetFeesAndRevenueChartDataByChain,
	useGetItemOverviewByChain,
	useGetVolumeChartDataByChain
} from '~/api/categories/chains/client'
import { useGetStabelcoinsChartDataByChain } from '~/api/categories/stablecoins/client'
import { useGetBridgeChartDataByChain } from '~/api/categories/bridges/client'
import { useMemo } from 'react'
import { getUtcDateObject } from '~/components/ECharts/utils'
import { getPercentChange, getPrevTvlFromChart, nearestUtc } from '~/utils'

export const useFetchChainChartData = ({
	denomination,
	selectedChain,
	volumeData,
	feesAndRevenueData,
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

	const { data: volumeChart, isLoading: fetchingVolumeChartDataByChain } = useGetVolumeChartDataByChain(
		volumeData?.totalVolume24h && router.query.volume === 'true' ? selectedChain : null
	)

	const { data: feesAndRevenueChart, isLoading: fetchingFeesAndRevenueChartDataByChain } =
		useGetFeesAndRevenueChartDataByChain(
			feesAndRevenueData?.totalFees24h && (router.query.fees === 'true' || router.query.revenue === 'true')
				? selectedChain
				: null
		)

	const { data: stablecoinsChartData, isLoading: fetchingStablecoinsChartDataByChain } =
		useGetStabelcoinsChartDataByChain(
			stablecoinsData?.totalMcapCurrent && router.query.stables === 'true' ? selectedChain : null
		)

	const { data: inflowsChartData, isLoading: fetchingInflowsChartData } = useGetBridgeChartDataByChain(
		inflowsData?.netInflows && router.query.inflows === 'true' ? selectedChain : null
	)

	const { data: usersData, isLoading: fetchingUsersChartData } = useFetchProtocolUsers(
		userData.activeUsers && router.query.addresses === 'true' ? 'chain$' + selectedChain : null
	)

	const { data: txsData, isLoading: fetchingTransactionsChartData } = useFetchProtocolTransactions(
		userData.transactions && router.query.txs === 'true' ? 'chain$' + selectedChain : null
	)

	const { data: derivativesData, isLoading: fetchingDerivativesData } = useGetItemOverviewByChain(
		perpsData?.totalVolume24h && router.query.derivatives === 'true' ? selectedChain : null,
		'derivatives'
	)

	const { data: chainAssetsChart, isLoading: fetchingChainAssetsChart } = useGetChainAssetsChart(
		chainAssets ? selectedChain : null
	)

	const isFetchingChartData =
		fetchingDenominationPriceHistory ||
		fetchingVolumeChartDataByChain ||
		fetchingFeesAndRevenueChartDataByChain ||
		fetchingStablecoinsChartDataByChain ||
		fetchingInflowsChartData ||
		fetchingUsersChartData ||
		fetchingTransactionsChartData ||
		fetchingDerivativesData ||
		fetchingChainAssetsChart

	const globalChart = useMemo(() => {
		const globalChart = chart.map((data) => {
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

		const normalizedDenomination = isNonUSDDenomination
			? Object.fromEntries(
					denominationPriceHistory.prices.map(([timestamp, price]) => [getUtcDateObject(timestamp / 1000), price])
			  )
			: []

		const finalTvlChart = isNonUSDDenomination
			? globalChart.map(([date, tvl]) => [date, tvl / normalizedDenomination[getUtcDateObject(date)]])
			: globalChart

		const finalVolumeChart = isNonUSDDenomination
			? volumeChart?.map(([date, volume]) => [date, volume / normalizedDenomination[getUtcDateObject(date)]])
			: volumeChart

		const finalPriceChart = isNonUSDDenomination
			? null
			: denominationPriceHistory?.prices?.map(([date, price]) => [
					dayjs(Math.floor(date)).utc().startOf('day').unix(),
					price
			  ])
		const finalMcapChart = isNonUSDDenomination
			? null
			: denominationPriceHistory?.mcaps?.map(([date, price]) => [
					dayjs(Math.floor(date)).utc().startOf('day').unix(),
					price
			  ])

		const finalTokenVolumeChart = isNonUSDDenomination
			? null
			: denominationPriceHistory?.volumes?.map(([date, price]) => [
					dayjs(Math.floor(date)).utc().startOf('day').unix(),
					price
			  ])

		const finalDerivativesChart = isNonUSDDenomination ? null : derivativesData?.totalDataChart

		const finalFeesAndRevenueChart = isNonUSDDenomination
			? feesAndRevenueChart?.map(([date, fees, revenue]) => [
					date,
					fees / normalizedDenomination[getUtcDateObject(date)],
					revenue / normalizedDenomination[getUtcDateObject(date)]
			  ])
			: feesAndRevenueChart

		const finalDevsChart = devMetricsData?.report?.monthly_devs?.map(({ k, v }) => [
			Math.floor(nearestUtc(dayjs(k).toDate().getTime()) / 1000),
			v
		])

		const finalCommitsChart = devMetricsData?.report?.monthly_devs?.map(({ k, cc }) => [
			Math.floor(nearestUtc(dayjs(k).toDate().getTime()) / 1000),
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
				volumeChart: finalVolumeChart,
				globalChart: finalTvlChart,
				raisesData: raisesChart,
				totalStablesData: stablecoinsChartData,
				bridgeData: inflowsChartData,
				usersData,
				developersChart: finalDevsChart,
				commitsChart: finalCommitsChart,
				txsData,
				chainTokenPriceData: finalPriceChart,
				chainTokenMcapData: finalMcapChart,
				chainTokenVolumeData: finalTokenVolumeChart,
				derivativesData: finalDerivativesChart,
				chainAssetsData: finalChainAssetsChart
			}
		]

		return chartDatasets
	}, [
		denomination,
		denominationPriceHistory,
		globalChart,
		volumeChart,
		derivativesData?.totalDataChart,
		feesAndRevenueChart,
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
	const valueChangeUSD = getPercentChange(totalValueUSD, tvlPrevDay)

	return {
		isFetchingChartData,
		chartDatasets,
		totalValueUSD,
		valueChangeUSD
	}
}
