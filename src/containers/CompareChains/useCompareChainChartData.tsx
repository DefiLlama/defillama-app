import * as React from 'react'
import { firstDayOfMonth, lastDayOfWeek } from '~/utils'

interface ChainData {
	chain: string
	globalChart?: Array<[number, number]>
	volumeChart?: Array<[number, number]>
	feesChart?: Array<[number, number]>
	appRevenueChart?: Array<[number, number]>
	usersData?: Array<[number, number]>
	txs?: Array<[number, number]>
	txsData?: Array<[number, number]>
}

const formatChartData = ({
	data,
	groupBy,
	chartType,
	dateInMs = false
}: {
	data: Array<[number, number]>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	chartType: 'line' | 'bar'
	dateInMs?: boolean
}): Array<[number, number]> => {
	if (!data || data.length === 0) return []

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
				: dateInMs
				? +date / 1e3
				: +date

			if (chartType === 'bar') {
				// Bar charts: sum up values
				store[dateKey] = (store[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			} else {
				// Line charts: use last value for each date
				store[dateKey] = value
			}
		}

		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}

	// Daily data - convert to milliseconds if needed
	return dateInMs ? (data as Array<[number, number]>) : data.map(([date, value]) => [+date * 1e3, value])
}

export const useCompareChainChartData = ({ datasets, router }: { datasets: Array<ChainData>; router: any }) => {
	const chartData = React.useMemo(() => {
		if (!datasets || datasets.length === 0) {
			return {}
		}

		const queryParams = router.query || {}
		const groupBy = ['daily', 'weekly', 'monthly', 'cumulative'].includes(queryParams.groupBy as any)
			? (queryParams.groupBy as 'daily' | 'weekly' | 'monthly' | 'cumulative')
			: 'daily'

		const finalCharts: Record<string, Array<[number, number]>> = {}

		datasets.forEach((chainData) => {
			if (!chainData) return

			const chainName = chainData.chain

			// TVL Charts - always shown unless explicitly disabled
			if (queryParams.tvl !== 'false' && chainData.globalChart) {
				const formattedData = formatChartData({
					data: chainData.globalChart,
					groupBy,
					chartType: 'line',
					dateInMs: true
				})
				if (formattedData.length > 0) {
					finalCharts[`${chainName} - TVL`] = formattedData
				}
			}

			// Volume Charts
			if (queryParams.volume === 'true' && chainData.volumeChart) {
				const formattedData = formatChartData({
					data: chainData.volumeChart,
					groupBy,
					chartType: 'bar',
					dateInMs: true
				})
				if (formattedData.length > 0) {
					finalCharts[`${chainName} - DEXs Volume`] = formattedData
				}
			}

			// Fees Charts
			if (queryParams.chainFees === 'true' && chainData.feesChart) {
				const formattedData = formatChartData({
					data: chainData.feesChart,
					groupBy,
					chartType: 'bar',
					dateInMs: true
				})
				if (formattedData.length > 0) {
					finalCharts[`${chainName} - Chain Fees`] = formattedData
				}
			}

			// Chain Revenue Charts
			if (queryParams.chainRevenue === 'true' && chainData.feesChart) {
				const formattedData = formatChartData({
					data: chainData.feesChart,
					groupBy,
					chartType: 'bar',
					dateInMs: true
				})
				if (formattedData.length > 0) {
					finalCharts[`${chainName} - Chain Revenue`] = formattedData
				}
			}

			// App Revenue Charts
			if (queryParams.appRevenue === 'true' && chainData.appRevenueChart) {
				const formattedData = formatChartData({
					data: chainData.appRevenueChart,
					groupBy,
					chartType: 'bar',
					dateInMs: true
				})
				if (formattedData.length > 0) {
					finalCharts[`${chainName} - App Revenue`] = formattedData
				}
			}

			// Active Addresses Charts
			if (queryParams.addresses === 'true' && chainData.usersData) {
				const formattedData = formatChartData({
					data: chainData.usersData,
					groupBy,
					chartType: 'bar',
					dateInMs: true
				})
				if (formattedData.length > 0) {
					finalCharts[`${chainName} - Active Addresses`] = formattedData
				}
			}

			// Transactions Charts
			if (queryParams.txs === 'true' && (chainData.txs || chainData.txsData)) {
				const txData = chainData.txs || chainData.txsData
				const formattedData = formatChartData({
					data: txData,
					groupBy,
					chartType: 'bar',
					dateInMs: true
				})
				if (formattedData.length > 0) {
					finalCharts[`${chainName} - Transactions`] = formattedData
				}
			}
		})

		return finalCharts
	}, [datasets, router.query])

	return {
		finalCharts: chartData,
		valueSymbol: '$',
		isFetchingChartData: false
	}
}
