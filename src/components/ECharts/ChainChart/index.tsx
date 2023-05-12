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
	transactions: '#307622'
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
	volumeData,
	feesData,
	priceData,
	usersData,
	txsData,
	raisesData,
	totalStablesData,
	denomination,
	updateRoute,
	route,
	...props
}) {
	const id = useMemo(() => uuid(), [])

	const [legendOptions, setLegendOptions] = useState(customLegendOptions)

	const chartsStack = stacks || customLegendOptions

	const [isDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol: denomination,
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
		const series = []

		if (route.tvl !== 'false') {
			series.push({
				name: 'TVL',
				chartId: 'TVL',
				type: 'line',
				yAxisIndex: 0,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: colors.tvl
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0,
							color: colors.tvl
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
			chartData.forEach(([date, value]) => {
				series[series.length - 1].data.push([getUtcDateObject(date), value])
			})
		}
		if (route.volume === 'true' && volumeData) {
			series.push({
				name: 'Volume',
				chartId: 'Volume',
				type: 'bar',
				data: [],
				yAxisIndex: 1,
				show: route.volume === 'true',
				itemStyle: {
					color: colors.volume
				}
			})
			volumeData.forEach(([date, value]) => {
				series[series.length - 1].data.push([getUtcDateObject(date), value])
			})
		}

		if (route.fees === 'true' && feesData) {
			series.push({
				name: 'Fees',
				chartId: 'Fees',
				type: 'bar',
				data: [],
				yAxisIndex: 2,
				itemStyle: {
					color: colors.fees
				}
			})
			feesData.forEach(([date, value]) => {
				series[series.length - 1].data.push([getUtcDateObject(date), value])
			})
		}

		if (route.revenue === 'true' && feesData) {
			series.push({
				name: 'Revenue',
				chartId: 'Revenue',
				type: 'bar',
				data: [],
				yAxisIndex: 3,
				itemStyle: {
					color: colors.revenue
				}
			})
			feesData.forEach(([date, _, value]) => {
				series[series.length - 1].data.push([getUtcDateObject(date), value])
			})
		}

		if (route.price === 'true' && priceData && denomination === 'USD') {
			series.push({
				name: 'Price',
				chartId: 'Price',
				symbol: 'none',
				type: 'line',
				data: [],
				yAxisIndex: 4,
				itemStyle: {
					color: colors.price
				}
			})
			priceData.forEach(([date, value]) => {
				if (Number(date) > Number(chartData[0][0])) series[series.length - 1].data.push([getUtcDateObject(date), value])
			})
		}

		if (route.users === 'true' && usersData?.length > 0) {
			series.push({
				name: 'Active Users',
				chartId: 'Active Users',
				type: 'bar',
				data: [],
				yAxisIndex: 5,
				itemStyle: {
					color: colors.activeUsers
				}
			})
			usersData.forEach(([date, value]) => {
				series[series.length - 1].data.push([getUtcDateObject(date), value])
			})
		}

		if (route.raises === 'true' && raisesData) {
			series.push({
				name: 'Raises',
				chartId: 'Raises',
				type: 'bar',
				data: [],
				yAxisIndex: 6,
				itemStyle: {
					color: colors.raises
				}
			})

			chartData.forEach(([date, value]) => {
				series[series.length - 1].data.push([
					getUtcDateObject(date),
					(raisesData[getUtcDateObject(date) as any] || 0) * 1e6
				])
			})
		}

		if (route.stables === 'true' && totalStablesData) {
			series.push({
				name: 'Stablecoins Mcap',
				chartId: 'Stablecoins Mcap',
				symbol: 'none',
				type: 'line',
				data: [],
				yAxisIndex: 7,
				itemStyle: {
					color: colors.stablecoins
				}
			})
			totalStablesData.forEach((data) => {
				series[series.length - 1].data.push([getUtcDateObject(data.date), data.Mcap])
			})
		}

		if (route.txs === 'true' && txsData?.length > 0) {
			series.push({
				name: 'Transactions',
				chartId: 'Transactions',
				type: 'bar',
				data: [],
				yAxisIndex: 8,
				itemStyle: {
					color: colors.transactions
				}
			})
			usersData.forEach(([date, value]) => {
				series[series.length - 1].data.push([getUtcDateObject(date), value])
			})
		}

		return [series, uniq(series.map((val) => val.chartId))]
	}, [
		chartData,
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
			Transactions: 65
		}
		let offsetAcc = -60

		chartInstance.setOption({
			graphic: { ...graphic },

			tooltip: {
				...tooltip
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
						color: () => Object.values(colors)[i]
					}
				}
			}),
			dataZoom: [...dataZoom],
			series
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, defaultChartSettings, series, chartOptions, expandTo100Percent, route, activeSeries])

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
