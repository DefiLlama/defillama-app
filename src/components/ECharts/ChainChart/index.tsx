import { useCallback, useEffect, useMemo, useState } from 'react'
import { uniq } from 'lodash'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { getUtcDateObject } from '../utils'
import { SelectLegendMultiple } from '../shared'
import { useDefaults } from '../useDefaults'
import { Toggle } from '../ProtocolChart/ProtocolChart'
import { FlexRow } from '~/layout/ProtocolAndPool'

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

const colors = {
	tvl: '#335cd7',
	volume: '#19ab17',
	fees: '#f150f4',
	revenue: '#b4b625'
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

	const [series, activeSeries] = useMemo(() => {
		const series = [
			{
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
			} as Record<string, any>
		]

		chartData.forEach(([date, value]) => {
			series[0].data.push([getUtcDateObject(date), value])
		})

		if (route.volume === 'true' && volumeData) {
			console.log({ volumeData })
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
				series[1].data.push([getUtcDateObject(date), value])
			})
		}

		if (route.fees === 'true' && feesData) {
			series.push({
				name: 'Fees',
				chartId: 'Fees',
				type: 'bar',
				stack: 'fees',
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
				chartId: 'Fees',
				type: 'bar',
				stack: 'fees',
				data: [],
				yAxisIndex: 2,
				itemStyle: {
					color: colors.revenue
				}
			})
			feesData.forEach(([date, _, value]) => {
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
				{ ...yAxis, scale: true, id: 'Fees' }
			].map((yAxis, i) => {
				return {
					...yAxis,
					offset: i > 1 && activeSeries.includes(yAxis.id) && activeSeries.length !== i ? 60 : 0,
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
		<div style={{ position: 'relative' }} {...props}>
			{customLegendName && customLegendOptions?.length > 1 && (
				<SelectLegendMultiple
					allOptions={customLegendOptions}
					options={legendOptions}
					setOptions={setLegendOptions}
					title={legendOptions.length === 1 ? legendTitle : legendTitle + 's'}
				/>
			)}

			<FlexRow style={{ marginLeft: '16px' }}>
				{volumeData ? (
					<Toggle backgroundColor={color}>
						<input
							type="checkbox"
							onClick={() => {
								updateRoute('volume', route.volume === 'true' ? 'false' : 'true')
							}}
							checked={route.volume === 'true'}
						/>
						<span data-wrapper="true" style={{ width: 'fit-content', height: '36px', marginTop: '8px' }}>
							<span>Volume</span>
						</span>
					</Toggle>
				) : null}
				{feesData ? (
					<Toggle backgroundColor={color}>
						<input
							type="checkbox"
							onClick={() => {
								updateRoute('fees', route.fees === 'true' ? 'false' : 'true')
							}}
							checked={route.fees === 'true'}
						/>
						<span data-wrapper="true" style={{ width: 'fit-content', height: '36px', marginTop: '8px' }}>
							<span>Fees</span>
						</span>
					</Toggle>
				) : null}
				{feesData ? (
					<Toggle backgroundColor={color}>
						<input
							type="checkbox"
							onClick={() => {
								updateRoute('revenue', route.revenue === 'true' ? 'false' : 'true')
							}}
							checked={route.revenue === 'true'}
						/>
						<span data-wrapper="true" style={{ width: 'fit-content', height: '36px', marginTop: '8px' }}>
							<span>Revenue</span>
						</span>
					</Toggle>
				) : null}
			</FlexRow>

			<Wrapper id={id} style={{ height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
