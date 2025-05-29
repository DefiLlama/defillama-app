import { useCallback, useEffect, useId, useMemo } from 'react'
import uniq from 'lodash/uniq'
import * as echarts from 'echarts/core'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { useRouter } from 'next/router'
import { primaryColor } from '~/constants/colors'
import { toK } from '~/utils'
import { cumulativeSum, groupByTimeFrame } from './utils'
import { chainOverviewChartColors } from './colors'

const groupableCharts = [
	'feesChart',
	'dexsChart',
	'aggregatorsData',
	'perpsChart',
	'chainTokenVolumeData',
	'appRevenueChart'
]

const colorsArray = [
	...Object.values(chainOverviewChartColors),
	'#00ffff',
	'#ffff00',
	'#8000ff',
	'#00ff00',
	'#00ff80',
	'#0080ff',
	'#ff8000',
	'#0000ff',
	'#ff0000',
	'#ff00ff',
	'#80ff00',
	'#ff0080'
]

const getAreaColor = (color, isThemeDark) => ({
	color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
		{
			offset: 0,
			color
		},
		{
			offset: 1,
			color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
		}
	])
})

const initGetColor = () => {
	let colorOffset = 0

	return (isCompare) => (isCompare ? colorsArray[colorOffset++] : null)
}

export function ChainChart({
	title,
	tooltipSort = true,
	height = '360px',
	width = null,
	expandTo100Percent = false,
	denomination,
	datasets,
	hideTooltip,
	isThemeDark,
	chartType,
	isFirstChart = false,
	compareMode = false,
	showLegend = false,
	...props
}) {
	const id = useId()
	const { query: routerRoute, pathname } = useRouter()
	const period = Number((routerRoute.period as string)?.replace('d', ''))
	const { groupBy } = routerRoute
	const route = useMemo(
		() => (chartType ? { tvl: 'false', [chartType]: 'true' } : routerRoute),
		[chartType, routerRoute]
	)
	const isCompare = pathname?.includes('compare') || compareMode

	let atleastOneBarChart = false
	for (const chartType in datasets[0]) {
		if (datasets[0][chartType] && groupableCharts.includes(chartType)) {
			atleastOneBarChart = true
		}
	}

	const defaultChartSettings = useDefaults({
		color: primaryColor,
		title,
		valueSymbol: denomination || 'USD',
		tooltipSort,
		hideLegend: true,
		isThemeDark,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly'].includes(groupBy) && atleastOneBarChart
				? (groupBy as 'daily' | 'weekly' | 'monthly')
				: 'daily'
	})

	const [series, activeSeries] = useMemo(() => {
		const getColor = initGetColor()
		const series = []
		datasets.forEach((chartData, i) => {
			let data = chartData
			if (groupBy && groupBy !== 'daily') {
				const groupedData = {}
				Object.entries(chartData).forEach(([key, val]: [string, Array<[number, number]>]) => {
					if (val) {
						if (groupableCharts.includes(key)) {
							if (Array.isArray(val?.[0])) {
								const periodData = period ? val?.slice(-period) : val
								groupedData[key] =
									groupBy === 'cumulative' ? cumulativeSum(periodData) : groupByTimeFrame(periodData, groupBy)
							}
						} else {
							groupedData[key] = val
						}
					}
				})
				data = groupedData
			}

			const namePrefix = isCompare ? data?.chain + ' ' : ''

			if (route.tvl !== 'false') {
				const color = getColor(isCompare) || chainOverviewChartColors.tvl
				const areaColor = getAreaColor(color, isThemeDark)

				series.push({
					name: namePrefix + 'TVL',
					chartId: 'TVL',
					type: 'line',
					yAxisIndex: 0,
					symbol: 'none',
					emphasis: {
						focus: 'series',
						shadowBlur: 10
					},

					itemStyle: {
						color
					},
					areaStyle: areaColor,
					data: [],
					show: true
				} as Record<string, any>)
				data?.globalChart?.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}
			if (route.dexs === 'true' && data?.dexsChart) {
				const color = getColor(isCompare) || chainOverviewChartColors.dexs
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'DEXs Volume',
					chartId: 'DEXs Volume',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 1,
					show: route.dexs === 'true',
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.dexsChart.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.chainFees === 'true' && data?.feesChart) {
				const color = getColor(isCompare) || chainOverviewChartColors.chainFees
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Chain Fees',
					chartId: 'Chain Fees',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 2,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.feesChart.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.chainRevenue === 'true' && data?.feesChart) {
				const color = getColor(isCompare) || chainOverviewChartColors.chainRevenue
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Chain Revenue',
					chartId: 'Chain Revenue',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 3,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.feesChart.forEach(([date, _, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.appRevenue === 'true' && data?.appRevenueChart) {
				const color = getColor(isCompare) || chainOverviewChartColors.appRevenue
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'App Revenue',
					chartId: 'App Revenue',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 4,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.appRevenueChart.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.price === 'true' && data?.priceData && denomination === 'USD') {
				const color = getColor(isCompare) || chainOverviewChartColors.price
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Price',
					chartId: 'Price',
					symbol: 'none',
					type: 'line',
					data: [],
					yAxisIndex: 5,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.priceData.forEach(([date, value]) => {
					if (data?.globalChart?.[0]?.[0] ? Number(date) > Number(data?.globalChart[0][0]) : true)
						series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.addresses === 'true' && data?.usersData?.length > 0) {
				const color1 = getColor(isCompare) || chainOverviewChartColors.returningUsers
				const color2 = getColor(isCompare) || chainOverviewChartColors.newUsers

				const areaColor = getAreaColor(color1, isThemeDark)
				series.push({
					name: namePrefix + 'Returning Users',
					chartId: 'Users',
					stack: 'Users',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 6,
					itemStyle: {
						color: color1
					},
					areaStyle: areaColor
				})
				data?.usersData.forEach(([date, value, value2]) => {
					series[series.length - 1].data.push([+date * 1e3, (value ?? 0) - (value2 ?? 0)])
				})
				series.push({
					name: namePrefix + 'New Users',
					chartId: 'Users',
					stack: 'Users',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 6,
					itemStyle: {
						color: color2
					},
					areaStyle: areaColor
				})
				data?.usersData.forEach(([date, value, value2]) => {
					series[series.length - 1].data.push([+date * 1e3, value2 ?? 0])
				})
			}

			if (route.raises === 'true' && data?.raisesData) {
				const color = getColor(isCompare) || chainOverviewChartColors.raises
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: 'Raises',
					chartId: 'Raises',
					type: 'bar',
					symbol: 'none',
					data: [],
					yAxisIndex: 7,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})

				data?.globalChart?.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, (data?.raisesData[date] || 0) * 1e6])
				})
			}

			if (route.stables === 'true' && data?.totalStablesData) {
				const color = getColor(isCompare) || chainOverviewChartColors.stablecoins
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Stablecoins Mcap',
					chartId: 'Stablecoins Mcap',
					symbol: 'none',
					type: 'line',
					data: [],
					yAxisIndex: 8,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.totalStablesData.forEach((data) => {
					series[series.length - 1].data.push([+data.date * 1e3, data.Mcap])
				})
			}

			if (route.txs === 'true' && data?.txsData?.length > 0) {
				const color = getColor(isCompare) || chainOverviewChartColors.transactions
				const areaColor = getAreaColor(color, isThemeDark)

				series.push({
					name: namePrefix + 'Transactions',
					chartId: 'Transactions',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 9,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.txsData.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.inflows === 'true' && data?.bridgeData && data?.bridgeData?.length > 0) {
				const color = getColor(isCompare) || chainOverviewChartColors.bridges
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Net Inflows',
					chartId: 'Inflows',
					type: 'bar',
					stack: 'bridge',
					symbol: 'none',
					data: [],
					yAxisIndex: 10,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.bridgeData.forEach(([date, inflow, outflow]) => {
					series[series.length - 1].data.push([+date * 1e3, outflow + inflow || 0])
				})
			}

			if (route.developers === 'true' && data?.developersChart && data?.developersChart?.length > 0) {
				const color = getColor(isCompare) || chainOverviewChartColors.developers
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Developers',
					chartId: 'Developers',
					type: 'bar',
					stack: 'developers',
					symbol: 'none',
					data: [],
					yAxisIndex: 11,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.developersChart?.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.devsCommits === 'true' && data?.commitsChart && data?.commitsChart?.length > 0) {
				const color = getColor(isCompare) || chainOverviewChartColors.devsCommits
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Commits',
					chartId: 'Commits',
					type: 'bar',
					stack: 'commits',
					data: [],
					yAxisIndex: 12,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.commitsChart?.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.chainTokenPrice === 'true' && data?.chainTokenPriceData && denomination === 'USD') {
				const color = getColor(isCompare) || chainOverviewChartColors.tokenPrice
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Token Price',
					chartId: 'Token Price',
					symbol: 'none',
					type: 'line',
					data: [],
					yAxisIndex: 13,
					itemStyle: {
						color: color
					},
					areaStyle: areaColor
				})
				data?.chainTokenPriceData.forEach(([date, value]) => {
					if (data?.globalChart?.[0]?.[0] ? Number(date) > Number(data?.globalChart[0][0]) : true)
						series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.chainTokenMcap === 'true' && data?.chainTokenMcapData) {
				const color = getColor(isCompare) || chainOverviewChartColors.tokenMcap
				const areaColor = getAreaColor(color, isThemeDark)

				series.push({
					name: namePrefix + 'Token Mcap',
					chartId: 'Token Mcap',
					symbol: 'none',
					type: 'line',
					data: [],
					yAxisIndex: 14,
					itemStyle: {
						color: color
					},
					areaStyle: areaColor
				})
				data?.chainTokenMcapData.forEach(([date, value]) => {
					if (data?.globalChart?.[0]?.[0] ? Number(date) > Number(data?.globalChart[0][0]) : true)
						series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.aggregators === 'true' && data?.aggregatorsData) {
				const color = getColor(isCompare) || chainOverviewChartColors.aggregators
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Aggregators Volume',
					chartId: 'Aggregators',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 15,
					itemStyle: {
						color: color
					},
					areaStyle: areaColor
				})
				data?.aggregatorsData.forEach(([date, value]) => {
					if (data?.globalChart?.[0]?.[0] ? Number(date) > Number(data?.globalChart[0][0]) : true)
						series[series.length - 1].data.push([+date * 1e3, value])
				})
			}
			if (route.perps === 'true' && data?.perpsChart) {
				const color = getColor(isCompare) || chainOverviewChartColors.perps
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Perps Volume',
					chartId: 'Perps',
					symbol: 'none',
					type: 'bar',
					data: [],
					yAxisIndex: 16,
					itemStyle: {
						color: color
					},
					areaStyle: areaColor
				})
				data?.perpsChart.forEach(([date, value]) => {
					if (data?.globalChart?.[0]?.[0] ? Number(date) > Number(data?.globalChart[0][0]) : true)
						series[series.length - 1].data.push([+date * 1e3, value])
				})
			}
			if (route.chainAssets === 'true' && data?.chainAssetsData) {
				const color = getColor(isCompare) || chainOverviewChartColors.chainAssets
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Bridged TVL',
					chartId: 'Chain Assets',
					symbol: 'none',
					type: 'line',
					data: [],
					yAxisIndex: 17,
					itemStyle: {
						color: color
					},
					areaStyle: areaColor
				})
				data?.chainAssetsData.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}
			if (route.chainTokenVolume === 'true' && data?.chainTokenVolumeData) {
				const color = getColor(isCompare) || chainOverviewChartColors.tokenVolume
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Token Volume',
					chartId: 'Token Volume',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 18,
					itemStyle: {
						color: color
					},
					areaStyle: areaColor
				})
				data?.chainTokenVolumeData.forEach(([date, value]) => {
					if (data?.globalChart?.[0]?.[0] ? Number(date) > Number(data?.globalChart[0][0]) : true)
						series[series.length - 1].data.push([+date * 1e3, value])
				})
			}

			if (route.chainIncentives === 'true' && data?.chainIncentivesChart) {
				const color = getColor(isCompare) || chainOverviewChartColors.chainIncentives
				const areaColor = getAreaColor(color, isThemeDark)
				series.push({
					name: namePrefix + 'Token Incentives',
					chartId: 'Chain Incentives',
					symbol: 'none',
					type: groupBy === 'cumulative' ? 'line' : 'bar',
					data: [],
					yAxisIndex: 19,
					itemStyle: {
						color
					},
					areaStyle: areaColor
				})
				data?.chainIncentivesChart.forEach(([date, value]) => {
					series[series.length - 1].data.push([+date * 1e3, value])
				})
			}
		})
		return [
			period
				? series.reverse().map(({ data, ...rest }) => ({ ...rest, data: data.slice(-Number(period)) }))
				: series.reverse(),
			uniq(series.map((val) => val.chartId))
		]
	}, [
		datasets,
		period,
		groupBy,
		isCompare,
		route.tvl,
		route.dexs,
		route.chainFees,
		route.chainRevenue,
		route.price,
		route.addresses,
		route.raises,
		route.stables,
		route.txs,
		route.inflows,
		route.developers,
		route.devsCommits,
		route.chainTokenPrice,
		route.chainTokenMcap,
		route.aggregators,
		route.perps,
		route.chainAssets,
		route.chainTokenVolume,
		route.appRevenue,
		denomination,
		isThemeDark
	])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, dataZoom, legend } = defaultChartSettings

		dataZoom[1] = {
			...dataZoom[1],
			left: grid.left,
			right: grid.right
		} as any

		const offsets = {
			TVL: 60,
			'DEs Volume': 60,
			'Chain Fees': 55,
			'Chain Revenue': 65,
			'App Revenue': 65,
			Price: 65,
			Raises: 65,
			Users: 60,
			'Stablecoins Mcap': 60,
			Transactions: 65,
			Inflows: 55,
			Developers: 55,
			Commits: 60,
			'Token Price': 55,
			'Token Mcap': 55,
			Aggregators: 55,
			Perps: 55,
			'Token Volume': 60
		}
		let offsetAcc = -60

		chartInstance.setOption({
			graphic: { ...graphic },
			legend: {
				...legend,
				left: 75,
				show: showLegend
			},
			tooltip: {
				...(hideTooltip
					? {}
					: {
							...tooltip,
							zIndex: 0,
							position: isFirstChart ? [400, 0] : [100, 0],
							backgroundColor: 'none',
							borderWidth: '0',
							padding: 15,
							textStyle: {
								color: isThemeDark ? 'white' : 'black'
							},
							extraCssText: 'box-shadow: none;'
					  })
			},
			title: {
				...titleDefaults
			},
			grid: {
				...grid
			},
			xAxis: {
				...xAxis
			},
			yAxis: [
				{
					...yAxis,
					id: 'TVL',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : !isThemeDark ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)')
					}
				},
				{
					...yAxis,
					id: 'DEXs Volume',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.dexs)
					}
				},
				{
					...yAxis,
					id: 'Chain Fees',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.chainFees)
					}
				},
				{
					...yAxis,
					id: 'Chain Revenue',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.chainRevenue)
					}
				},
				{
					...yAxis,
					id: 'App Revenue',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.appRevenue)
					}
				},
				{
					...yAxis,
					id: 'Price',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.price)
					}
				},
				{
					...yAxis,
					axisLabel: {
						formatter: (value) => toK(value) + ' ' + 'Users',
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.returningUsers)
					},
					id: 'Users'
				},
				{
					...yAxis,
					id: 'Raises',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.raises)
					}
				},
				{
					...yAxis,
					id: 'Stablecoins Mcap',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.stablecoins)
					}
				},
				{
					...yAxis,
					axisLabel: {
						formatter: (value) => toK(value) + ' ' + 'TXs',
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.transactions)
					},
					id: 'Transactions'
				},
				{
					...yAxis,
					id: 'Inflows',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.bridges)
					}
				},
				{
					...yAxis,
					id: 'Developers',
					axisLabel: {
						...yAxis.axisLabel,
						formatter: (value) => value + ' devs',
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.developers)
					}
				},
				{
					...yAxis,
					id: 'Commits',
					axisLabel: {
						...yAxis.axisLabel,
						formatter: (value) => value + ' commits',
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.devsCommits)
					}
				},
				{
					...yAxis,
					id: 'Token Price',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.tokenPrice)
					}
				},
				{
					...yAxis,
					id: 'Token Mcap',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.tokenMcap)
					}
				},
				{
					...yAxis,
					id: 'Aggregators',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.aggregators)
					}
				},
				{
					...yAxis,
					id: 'Perps',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.perps)
					}
				},
				{
					...yAxis,
					min: 0,
					id: 'Chain Assets',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.chainAssets)
					}
				},
				{
					...yAxis,
					id: 'Token Volume',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.tokenVolume)
					}
				},
				{
					...yAxis,
					id: 'Chain Incentives',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : chainOverviewChartColors.chainIncentives)
					}
				}
			].map((yAxis: any, i) => {
				const isActive = activeSeries?.findIndex((id) => id === yAxis.id) !== -1
				const defaultOffset = offsets[yAxis.id] || 40
				const offset = isActive && defaultOffset ? offsetAcc + defaultOffset : 0
				offsetAcc = isActive && i !== 0 ? offsetAcc + defaultOffset : offsetAcc
				return {
					...yAxis,
					offset,
					axisLabel: {
						...yAxis.axisLabel,
						color: yAxis.axisLabel.color
					}
				}
			}),
			dataZoom: [...dataZoom],
			series
		})

		if (hideTooltip) {
			chartInstance.dispatchAction({
				type: 'showTip',
				// index of series, which is optional when trigger of tooltip is axis
				seriesIndex: 0,
				// data index; could assign by name attribute when not defined
				dataIndex: (series[0]?.data?.length ?? 1) - 1,
				// Position of tooltip. Only works in this action.
				// Use tooltip.position in option by default.
				position: [100, 0]
			})

			chartInstance.on('globalout', () => {
				chartInstance.dispatchAction({
					type: 'showTip',
					// index of series, which is optional when trigger of tooltip is axis
					seriesIndex: 0,
					// data index; could assign by name attribute when not defined
					dataIndex: (series[0]?.data?.length ?? 1) - 1,
					// Position of tooltip. Only works in this action.
					// Use tooltip.position in option by default.
					position: [100, 0]
				})
			})
		}

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [
		createInstance,
		defaultChartSettings,
		series,
		expandTo100Percent,
		route,
		activeSeries,
		hideTooltip,
		isCompare,
		isThemeDark,
		isFirstChart,
		showLegend
	])

	return (
		<div className="relative" {...props}>
			<div id={id} className="my-auto min-h-[360px]" style={height ? { minHeight: height } : undefined} />
		</div>
	)
}
