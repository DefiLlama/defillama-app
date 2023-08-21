import { useRouter } from 'next/router'
import dayjs from 'dayjs'

import {
	useDenominationPriceHistory,
	useFetchProtocolTransactions,
	useFetchProtocolUsers
} from '~/api/categories/protocols/client'
import { useGetFeesAndRevenueChartDataByChain, useGetVolumeChartDataByChain } from '~/api/categories/chains/client'
import { useGetStabelcoinsChartDataByChain } from '~/api/categories/stablecoins/client'
import { useGetBridgeChartDataByChain } from '~/api/categories/bridges/client'
import { useMemo } from 'react'
import { getUtcDateObject } from '~/components/ECharts/utils'
import { getPercentChange, getPrevTvlFromChart, nearestUtc } from '~/utils'

export const useFetchChainChartData = ({
	denomination,
	selectedChain,
	chainGeckoId,
	volumeData,
	feesAndRevenueData,
	stablecoinsData,
	inflowsData,
	userData,
	raisesChart,
	chart,
	extraTvlCharts,
	extraTvlsEnabled,
	devMetricsData
}) => {
	const router = useRouter()

	const { data: denominationPriceHistory, loading: fetchingDenominationPriceHistory } = useDenominationPriceHistory(
		denomination !== 'USD' || router.query.price === 'true' ? chainGeckoId : null
	)

	const { data: volumeChart, loading: fetchingVolumeChartDataByChain } = useGetVolumeChartDataByChain(
		volumeData?.totalVolume24h && router.query.volume === 'true' ? selectedChain : null
	)

	const { data: feesAndRevenueChart, loading: fetchingFeesAndRevenueChartDataByChain } =
		useGetFeesAndRevenueChartDataByChain(
			feesAndRevenueData?.totalFees24h && (router.query.fees === 'true' || router.query.revenue === 'true')
				? selectedChain
				: null
		)

	const { data: stablecoinsChartData, loading: fetchingStablecoinsChartDataByChain } =
		useGetStabelcoinsChartDataByChain(
			stablecoinsData?.totalMcapCurrent && router.query.stables === 'true' ? selectedChain : null
		)

	const { data: inflowsChartData, loading: fetchingInflowsChartData } = useGetBridgeChartDataByChain(
		inflowsData?.netInflows && router.query.inflows === 'true' ? selectedChain : null
	)

	const { data: usersData, loading: fetchingUsersChartData } = useFetchProtocolUsers(
		userData.activeUsers && router.query.users === 'true' ? 'chain$' + selectedChain : null
	)

	const { data: txsData, loading: fetchingTransactionsChartData } = useFetchProtocolTransactions(
		userData.transactions && router.query.txs === 'true' ? 'chain$' + selectedChain : null
	)

	const isFetchingChartData =
		(denomination !== 'USD' && fetchingDenominationPriceHistory) ||
		fetchingVolumeChartDataByChain ||
		fetchingFeesAndRevenueChartDataByChain ||
		fetchingStablecoinsChartDataByChain ||
		fetchingInflowsChartData ||
		fetchingUsersChartData ||
		fetchingTransactionsChartData

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
		const priceData =
			denomination === 'USD' && denominationPriceHistory?.prices
				? denominationPriceHistory?.prices.map(([timestamp, price]) => [timestamp / 1000, price])
				: null

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
		const finalContributersChart = devMetricsData?.report?.monthly_contributers?.map(({ k, v }) => [
			Math.floor(nearestUtc(dayjs(k).toDate().getTime()) / 1000),
			v
		])

		const chartDatasets = [
			{
				feesChart: finalFeesAndRevenueChart,
				volumeChart: finalVolumeChart,
				globalChart: finalTvlChart,
				raisesData: raisesChart,
				totalStablesData: stablecoinsChartData,
				bridgeData: inflowsChartData,
				usersData,
				contributersChart: finalContributersChart,
				developersChart: finalDevsChart,
				txsData,
				priceData
			}
		]

		return chartDatasets
	}, [
		chainGeckoId,
		denomination,
		denominationPriceHistory,
		feesAndRevenueChart,
		globalChart,
		inflowsChartData,
		raisesChart,
		stablecoinsChartData,
		txsData,
		usersData,
		volumeChart,
		devMetricsData?.report?.monthly_contributers,
		devMetricsData?.report?.monthly_devs
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
