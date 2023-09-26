import { useCallback, useEffect, useMemo } from 'react'
import uniq from 'lodash/uniq'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import { getUtcDateObject } from '../utils'
import { useDefaults } from '../useDefaults'
import { useRouter } from 'next/router'
import { primaryColor } from '~/constants/colors'
import { toK } from '~/utils'

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

const colors = {
	tvl: '#335cd7',
	volume: '#19ab17',
	fees: '#f150f4',
	revenue: '#b4b625',
	price: '#da1f73',
	returningUsers: '#fa4646',
	newUsers: '#46faf2',
	raises: '#7700ff',
	stablecoins: '#00a09d',
	transactions: '#307622',
	bridges: '#ffb12b',
	developers: '#ff6969',
	devsCommits: '#39601f'
}

const colorsArray = [
	...Object.values(colors),
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

const initGetColor = () => {
	let colorOffset = 0

	return (isCompare) => (isCompare ? colorsArray[colorOffset++] : null)
}

export default function AreaChart({
	title,
	tooltipSort = true,
	height = '360px',
	expandTo100Percent = false,
	denomination,
	datasets,
	hideTooltip,
	isThemeDark,
	...props
}) {
	const id = useMemo(() => uuid(), [])
	const { query: route, pathname } = useRouter()

	const isCompare = pathname?.includes('compare')

	const defaultChartSettings = useDefaults({
		color: primaryColor,
		title,
		valueSymbol: denomination || 'USD',
		tooltipSort,
		hideLegend: true,
		isThemeDark
	})

	const [series, activeSeries] = useMemo(() => {
		const getColor = initGetColor()
		const series = []
		datasets.forEach((data, i) => {
			const namePrefix = isCompare ? data?.chain + ' ' : ''

			if (route.tvl !== 'false') {
				const color = getColor(isCompare) || colors.tvl
				series.push({
					name: namePrefix + 'TVL',
					chartId: 'TVL',
					type: 'line',
					yAxisIndex: 0,
					emphasis: {
						focus: 'series',
						shadowBlur: 10
					},
					symbol: 'none',
					itemStyle: {
						color
					},
					areaStyle: {
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
					},
					data: [],
					show: true
				} as Record<string, any>)
				data?.globalChart.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}
			if (route.volume === 'true' && data?.volumeChart) {
				series.push({
					name: namePrefix + 'Volume',
					chartId: 'Volume',
					type: 'bar',
					data: [],
					yAxisIndex: 1,
					show: route.volume === 'true',
					itemStyle: {
						color: getColor(isCompare) || colors.volume
					}
				})
				data?.volumeChart.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}

			if (route.fees === 'true' && data?.feesChart) {
				series.push({
					name: namePrefix + 'Fees',
					chartId: 'Fees',
					type: 'bar',
					data: [],
					yAxisIndex: 2,
					itemStyle: {
						color: getColor(isCompare) || colors.fees
					}
				})
				data?.feesChart.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}

			if (route.revenue === 'true' && data?.feesChart) {
				series.push({
					name: namePrefix + 'Revenue',
					chartId: 'Revenue',
					type: 'bar',
					data: [],
					yAxisIndex: 3,
					itemStyle: {
						color: getColor(isCompare) || colors.revenue
					}
				})
				data?.feesChart.forEach(([date, _, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}

			if (route.price === 'true' && data?.priceData && denomination === 'USD') {
				series.push({
					name: namePrefix + 'Price',
					chartId: 'Price',
					symbol: 'none',
					type: 'line',
					data: [],
					yAxisIndex: 4,
					itemStyle: {
						color: getColor(isCompare) || colors.price
					}
				})
				data?.priceData.forEach(([date, value]) => {
					if (Number(date) > Number(data?.globalChart[0][0]))
						series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}

			if (route.users === 'true' && data?.usersData?.length > 0) {
				series.push({
					name: namePrefix + 'Returning Users',
					chartId: 'Users',
					stack: 'Users',
					type: 'bar',
					data: [],
					yAxisIndex: 5,
					itemStyle: {
						color: getColor(isCompare) || colors.returningUsers
					}
				})
				data?.usersData.forEach(([date, value, value2]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), (value ?? 0) - (value2 ?? 0)])
				})
				series.push({
					name: namePrefix + 'New Users',
					chartId: 'Users',
					stack: 'Users',
					type: 'bar',
					data: [],
					yAxisIndex: 5,
					itemStyle: {
						color: getColor(isCompare) || colors.newUsers
					}
				})
				data?.usersData.forEach(([date, value, value2]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value2 ?? 0])
				})
			}

			if (route.raises === 'true' && data?.raisesData) {
				series.push({
					name: 'Raises',
					chartId: 'Raises',
					type: 'bar',
					data: [],
					yAxisIndex: 6,
					itemStyle: {
						color: getColor(isCompare) || colors.raises
					}
				})

				data?.globalChart.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), (data?.raisesData[date] || 0) * 1e6])
				})
			}

			if (route.stables === 'true' && data?.totalStablesData) {
				series.push({
					name: namePrefix + 'Stablecoins Mcap',
					chartId: 'Stablecoins Mcap',
					symbol: 'none',
					type: 'line',
					data: [],
					yAxisIndex: 7,
					itemStyle: {
						color: getColor(isCompare) || colors.stablecoins
					}
				})
				data?.totalStablesData.forEach((data) => {
					series[series.length - 1].data.push([getUtcDateObject(data.date), data.Mcap])
				})
			}

			if (route.txs === 'true' && data?.txsData?.length > 0) {
				series.push({
					name: namePrefix + 'Transactions',
					chartId: 'Transactions',
					type: 'bar',
					data: [],
					yAxisIndex: 8,
					itemStyle: {
						color: getColor(isCompare) || colors.transactions
					}
				})
				data?.txsData.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}

			if (route.inflows === 'true' && data?.bridgeData && data?.bridgeData?.length > 0) {
				series.push({
					name: namePrefix + 'Net Inflows',
					chartId: 'Inflows',
					type: 'bar',
					stack: 'bridge',
					data: [],
					yAxisIndex: 9,
					itemStyle: {
						color: getColor(isCompare) || colors.bridges
					}
				})
				data?.bridgeData.forEach(([date, inflow, outflow]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), outflow + inflow || 0])
				})
			}

			if (route.developers === 'true' && data?.developersChart && data?.developersChart?.length > 0) {
				series.push({
					name: namePrefix + 'Developers',
					chartId: 'Developers',
					type: 'bar',
					stack: 'developers',
					data: [],
					yAxisIndex: 10,
					itemStyle: {
						color: getColor(isCompare) || colors.developers
					}
				})
				data?.developersChart?.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}

			if (route.devsCommits === 'true' && data?.commitsChart && data?.commitsChart?.length > 0) {
				series.push({
					name: namePrefix + 'Commits',
					chartId: 'Commits',
					type: 'bar',
					stack: 'commits',
					data: [],
					yAxisIndex: 11,
					itemStyle: {
						color: getColor(isCompare) || colors.devsCommits
					}
				})
				data?.commitsChart?.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}
		})

		return [series.reverse(), uniq(series.map((val) => val.chartId))]
	}, [datasets, isThemeDark, route, denomination, isCompare])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

		dataZoom[1] = {
			...dataZoom[1],
			left: grid.left,
			right: grid.right
		} as any

		const offsets = {
			TVL: undefined,
			Volume: 60,
			Fees: 55,
			Revenue: 65,
			Price: 65,
			Raises: 65,
			Users: 60,
			'Stablecoins Mcap': 60,
			Transactions: 65,
			Inflows: 55,
			Developers: 55,
			Commits: 60
		}
		let offsetAcc = -60

		chartInstance.setOption({
			graphic: { ...graphic },

			tooltip: {
				...tooltip,
				...(hideTooltip
					? {
							position: [100, 0],
							backgroundColor: 'none',
							borderWidth: '0',
							padding: 0,
							textStyle: {
								color: isThemeDark ? 'white' : 'black'
							},
							extraCssText: 'box-shadow: none;'
					  }
					: {})
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
					scale: true,
					id: 'Volume',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : colors.volume)
					}
				},
				{
					...yAxis,
					scale: true,
					id: 'Fees',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : colors.fees)
					}
				},
				{
					...yAxis,
					scale: true,
					id: 'Revenue',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : colors.revenue)
					}
				},
				{
					...yAxis,
					scale: true,
					id: 'Price',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : colors.price)
					}
				},
				{
					...yAxis,
					axisLabel: {
						formatter: (value) => toK(value) + ' ' + 'Users',
						color: () => (isCompare ? '#fff' : colors.returningUsers)
					},
					scale: true,
					id: 'Users'
				},
				{
					...yAxis,
					scale: true,
					id: 'Raises',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : colors.raises)
					}
				},
				{
					...yAxis,
					scale: true,
					id: 'Stablecoins Mcap',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : colors.stablecoins)
					}
				},
				{
					...yAxis,
					axisLabel: {
						formatter: (value) => toK(value) + ' ' + 'TXs',
						color: () => (isCompare ? '#fff' : colors.transactions)
					},
					scale: true,
					id: 'Transactions'
				},
				{
					...yAxis,
					scale: true,
					id: 'Inflows',
					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : colors.bridges)
					}
				},
				{
					...yAxis,
					scale: true,
					id: 'Developers',
					axisLabel: {
						...yAxis.axisLabel,
						formatter: (value) => value + ' devs',
						color: () => (isCompare ? '#fff' : colors.developers)
					}
				},
				{
					...yAxis,
					scale: true,
					id: 'Commits',
					axisLabel: {
						...yAxis.axisLabel,
						formatter: (value) => value + ' commits',
						color: () => (isCompare ? '#fff' : colors.devsCommits)
					}
				}
			].map((yAxis: any, i) => {
				const isActive = activeSeries?.findIndex((id) => id === yAxis.id) !== -1
				const defaultOffset = offsets[yAxis.id] || 40
				const offset = isActive && defaultOffset ? offsetAcc + defaultOffset : 0
				offsetAcc = isActive && i !== 0 ? offsetAcc + defaultOffset : offsetAcc
				return {
					...yAxis,
					offset
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
		isThemeDark
	])

	return (
		<div style={{ position: 'relative', minHeight: height }} {...props}>
			<Wrapper id={id} style={{ minHeight: height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
