import { useRouter } from 'next/router'
import dayjs from 'dayjs'

import {
	useDenominationPriceHistory,
	useFetchProtocolTransactions,
	useFetchProtocolUsers
} from '~/api/categories/protocols/client'
import {
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
	devMetricsData,
	chainTokenInfo
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
		userData.activeUsers && router.query.addresses === 'true' ? 'chain$' + selectedChain : null
	)

	const { data: txsData, loading: fetchingTransactionsChartData } = useFetchProtocolTransactions(
		userData.transactions && router.query.txs === 'true' ? 'chain$' + selectedChain : null
	)

	const { data: priceChartData, loading: fetchingPriceChartData } = useDenominationPriceHistory(
		chainTokenInfo?.gecko_id
	)

	const { data: derivativesData, loading: fetchingDerivativesData } = useGetItemOverviewByChain(
		selectedChain,
		'derivatives'
	)

	const { data: aggregatorsData, loading: fetchingAggregatorsData } = useGetItemOverviewByChain(
		selectedChain,
		'aggregators'
	)

	const isFetchingChartData =
		(denomination !== 'USD' && fetchingDenominationPriceHistory) ||
		fetchingVolumeChartDataByChain ||
		fetchingFeesAndRevenueChartDataByChain ||
		fetchingStablecoinsChartDataByChain ||
		fetchingInflowsChartData ||
		fetchingUsersChartData ||
		fetchingTransactionsChartData ||
		fetchingPriceChartData ||
		fetchingAggregatorsData ||
		fetchingDerivativesData

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

		const finalPriceChart = isNonUSDDenomination
			? null
			: priceChartData?.prices?.map(([date, price]) => [dayjs(Math.floor(date)).utc().startOf('day').unix(), price])
		const finalMcapChart = isNonUSDDenomination
			? null
			: priceChartData?.mcaps?.map(([date, price]) => [dayjs(Math.floor(date)).utc().startOf('day').unix(), price])

		const finalTokenVolumeChart = isNonUSDDenomination
			? null
			: priceChartData?.volumes?.map(([date, price]) => [dayjs(Math.floor(date)).utc().startOf('day').unix(), price])

		const finalAggregatorsChart = isNonUSDDenomination ? null : aggregatorsData?.totalDataChart
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
				priceData,
				chainTokenPriceData: finalPriceChart,
				chainTokenMcapData: finalMcapChart,
				chainTokenVolumeData: finalTokenVolumeChart,
				aggregatorsData: finalAggregatorsChart,
				derivativesData: finalDerivativesChart
			}
		]

		return chartDatasets
	}, [
		denomination,
		denominationPriceHistory,
		chainGeckoId,
		globalChart,
		volumeChart,
		priceChartData?.prices,
		priceChartData?.mcaps,
		priceChartData?.volumes,
		aggregatorsData?.totalDataChart,
		derivativesData?.totalDataChart,
		feesAndRevenueChart,
		devMetricsData?.report?.monthly_devs,
		raisesChart,
		stablecoinsChartData,
		inflowsChartData,
		usersData,
		txsData
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
