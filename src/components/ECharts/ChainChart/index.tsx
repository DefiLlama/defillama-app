import { useCallback, useEffect, useMemo, useState } from 'react'
import { uniq } from 'lodash'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { getUtcDateObject } from '../utils'
import { SelectLegendMultiple } from '../shared'
import { useDefaults } from '../useDefaults'

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

const colors = {
	tvl: '#335cd7',
	volume: '#19ab17',
	fees: '#f150f4',
	revenue: '#b4b625',
	price: '#da1f73',
	activeUsers: '#fa4646',
	raises: '#7700ff',
	stablecoins: '#00a09d',
	transactions: '#307622',
	bridges: '#ffb12b'
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

// TODO remove color prop and use stackColors by default
export default function AreaChart({
	chartData,
	stacks,
	stackColors,
	title,
	color,
	hallmarks,
	customLegendName,
	customLegendOptions,
	tooltipSort = true,
	chartOptions,
	height = '360px',
	expandTo100Percent = false,
	isStackedChart,
	hideGradient = false,
	volumeData = [],
	feesData = [],
	priceData = [],
	usersData = [],
	txsData = [],
	raisesData = [],
	totalStablesData = [],
	bridgeData = [],
	denomination,
	updateRoute,
	datasets = [],
	router,
	hideTooltip,
	...props
}) {
	const id = useMemo(() => uuid(), [])
	const { query: route, pathname } = router
	const isCompare = pathname?.includes('compare')

	const [legendOptions, setLegendOptions] = useState(customLegendOptions)

	const chartsStack = stacks || customLegendOptions

	const [isDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol: denomination || 'USD',
		tooltipSort,
		hideLegend: true,
		isStackedChart
	})
	const usersChartSetting = useDefaults({
		color,
		title,
		valueSymbol: 'Users',
		tooltipSort,
		hideLegend: true,
		isStackedChart
	})

	const txsChartSetting = useDefaults({
		color,
		title,
		valueSymbol: 'TXs',
		tooltipSort,
		hideLegend: true,
		isStackedChart
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
								color: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
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
					name: namePrefix + 'Active Users',
					chartId: 'Active Users',
					type: 'bar',
					data: [],
					yAxisIndex: 5,
					itemStyle: {
						color: getColor(isCompare) || colors.activeUsers
					}
				})
				data?.usersData.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
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
					series[series.length - 1].data.push([
						getUtcDateObject(date),
						(data?.raisesData[getUtcDateObject(date) as any] || 0) * 1e6
					])
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
					name: namePrefix + 'Inflows',
					chartId: 'Inflows',
					type: 'bar',
					stack: 'bridge',
					data: [],
					yAxisIndex: 9,
					itemStyle: {
						color: getColor(isCompare) || colors.bridges
					}
				})
				data?.bridgeData.forEach(([date, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})

				series.push({
					name: namePrefix + 'Outflows',
					chartId: 'Inflows',
					type: 'bar',
					stack: 'bridge',
					data: [],
					yAxisIndex: 9,
					itemStyle: {
						color: getColor(isCompare) || colors.bridges
					}
				})
				data?.bridgeData.forEach(([date, _, value]) => {
					series[series.length - 1].data.push([getUtcDateObject(date), value])
				})
			}
		})

		return [series.reverse(), uniq(series.map((val) => val.chartId))]
	}, [
		datasets,
		chartsStack,
		color,
		customLegendName,
		hallmarks,
		isDark,
		legendOptions,
		stackColors,
		expandTo100Percent,
		isStackedChart,
		hideGradient,
		route,
		volumeData
	])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

		for (const option in chartOptions) {
			if (defaultChartSettings[option]) {
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}
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
			'Active Users': 60,
			'Stablecoins Mcap': 60,
			Transactions: 65,
			Inflows: 55
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
								color: isDark ? 'white' : 'black'
							}
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
					id: 'TVL'
				},
				{
					...yAxis,
					scale: true,
					id: 'Volume'
				},
				{ ...yAxis, scale: true, id: 'Fees' },
				{
					...yAxis,
					scale: true,
					id: 'Revenue'
				},
				{
					...yAxis,
					scale: true,
					id: 'Price'
				},
				{
					...usersChartSetting.yAxis,
					scale: true,
					id: 'Active Users'
				},
				{
					...yAxis,
					scale: true,
					id: 'Raises'
				},
				{
					...yAxis,
					scale: true,
					id: 'Stablecoins Mcap'
				},
				{
					...txsChartSetting.yAxis,
					scale: true,
					id: 'Transactions'
				},
				{
					...txsChartSetting.yAxis,
					scale: true,
					id: 'Inflows'
				}
			].map((yAxis: any, i) => {
				const isActive = activeSeries?.findIndex((id) => id === yAxis.id) !== -1
				const defaultOffset = offsets[yAxis.id]
				const offset = isActive && defaultOffset ? offsetAcc + defaultOffset : 0
				offsetAcc = isActive && i !== 0 ? offsetAcc + defaultOffset : offsetAcc
				return {
					...yAxis,
					offset,

					axisLabel: {
						...yAxis.axisLabel,
						color: () => (isCompare ? '#fff' : Object.values(colors)[i])
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
	}, [createInstance, defaultChartSettings, series, chartOptions, expandTo100Percent, route, activeSeries, hideTooltip])

	const legendTitle = customLegendName === 'Category' && legendOptions.length > 1 ? 'Categorie' : customLegendName

	return (
		<div style={{ position: 'relative', minHeight: height }} {...props}>
			{customLegendName && customLegendOptions?.length > 1 && (
				<SelectLegendMultiple
					allOptions={customLegendOptions}
					options={legendOptions}
					setOptions={setLegendOptions}
					title={legendOptions.length === 1 ? legendTitle : legendTitle + 's'}
				/>
			)}

			<Wrapper id={id} style={{ minHeight: height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
