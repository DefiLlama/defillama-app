import * as echarts from 'echarts/core'
import { useEffect, useId, useMemo, useRef } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { formattedNum } from '~/utils'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { mergeDeep, stringToColour } from '../utils'

// AreaChart where tooltip is always shown
export default function AreaChart({
	chartData,
	stacks,
	stackColors,
	valueSymbol = '',
	title,
	color,
	hallmarks: _hallmarks,
	customLegendName,
	customLegendOptions,
	tooltipSort = true,
	chartOptions,
	height,
	expandTo100Percent: _expandTo100Percent = false,
	isStackedChart,
	hideGradient: _hideGradient = false,
	alwaysShowTooltip = true,
	hideLegend = true,
	hideDataZoom = false,
	onReady,
	...props
}: IChartProps) {
	const id = useId()

	const chartsStack = stacks || customLegendOptions

	const [isThemeDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		tooltipSort,
		hideLegend,
		isStackedChart,
		isThemeDark
	})

	const series = useMemo(() => {
		const chartColor = color || stringToColour()

		const series: Record<string, any> = {}
		let index = 0
		for (const stack of chartsStack) {
			const stackColor = stackColors?.[stack]
			series[stack] = {
				name: stack,
				type: 'line',
				yAxisIndex: index,
				scale: true,
				large: true,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: stackColor || null
				},

				areaStyle: {
					color: !customLegendName
						? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{
									offset: 0,
									color: stackColor ? stackColor : index === 0 ? chartColor : 'transparent'
								},
								{
									offset: 1,
									color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
								}
							])
						: null
				},
				markLine: {},
				data: []
			}
			index++
		}

		for (const { date, ...item } of chartData) {
			for (const stack of chartsStack) {
				series[stack].data.push([+date * 1e3, item[stack] || 0])
			}
		}

		return Object.values(series)
	}, [chartData, chartsStack, color, customLegendName, isThemeDark, stackColors])

	useEffect(() => {
		// create instance
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance

		onReady?.(instance)

		for (const option in chartOptions) {
			if (defaultChartSettings[option]) {
				defaultChartSettings[option] = mergeDeep(defaultChartSettings[option], chartOptions[option])
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, titleDefaults, grid: _grid, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

		const shouldHideDataZoom = series.every((s) => s.data.length < 2) || hideDataZoom

		instance.setOption({
			graphic: { ...graphic },
			tooltip: alwaysShowTooltip
				? {
						...tooltip,
						position: [60, 0],
						backgroundColor: 'none',
						borderWidth: '0',
						padding: 8,
						boxShadow: 'none',
						textStyle: {
							color: isThemeDark ? 'white' : 'black'
						}
					}
				: tooltip,
			title: {
				...titleDefaults
			},
			...(hideLegend
				? {}
				: {
						legend: {
							top: 0,
							left: 'center',
							textStyle: {
								color: isThemeDark ? '#ffffff' : '#000000'
							}
						}
					}),
			grid: {
				left: 12,
				bottom: shouldHideDataZoom ? 12 : 68,
				top: hideLegend ? 12 : 32,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			xAxis: {
				...xAxis
			},
			yAxis:
				stacks.length === 1
					? yAxis
					: [
							{
								...yAxis,
								axisLabel: {
									formatter: (value) => value + '%'
								},
								axisLine: {
									show: true,
									lineStyle: {
										color: stackColors['APY']
									}
								}
							},
							{
								...yAxis,
								axisLabel: {
									formatter: (value) => formattedNum(value, true)
								},
								axisLine: {
									show: true,
									lineStyle: {
										color: stackColors['TVL']
									}
								}
							}
						],
			dataZoom: shouldHideDataZoom ? [] : [...dataZoom],
			series
		})

		if (alwaysShowTooltip && series && series.length > 0 && series[0]?.data?.length > 0) {
			instance.dispatchAction({
				type: 'showTip',
				// index of series, which is optional when trigger of tooltip is axis
				seriesIndex: 0,
				// data index; could assign by name attribute when not defined
				dataIndex: series[0].data.length - 1,
				// Position of tooltip. Only works in this action.
				// Use tooltip.position in option by default.
				position: [60, 0]
			})

			instance.on('globalout', () => {
				instance.dispatchAction({
					type: 'showTip',
					// index of series, which is optional when trigger of tooltip is axis
					seriesIndex: 0,
					// data index; could assign by name attribute when not defined
					dataIndex: series[0].data.length - 1,
					// Position of tooltip. Only works in this action.
					// Use tooltip.position in option by default.
					position: [60, 0]
				})
			})
		}

		return () => {
			chartRef.current = null
			instance.dispose()
		}
	}, [
		id,
		defaultChartSettings,
		series,
		chartOptions,
		stackColors,
		isThemeDark,
		stacks.length,
		alwaysShowTooltip,
		hideLegend,
		onReady,
		hideDataZoom
	])

	return (
		<div className="relative" {...props}>
			<div id={id} className="h-[360px]" style={height ? { height } : undefined} />
		</div>
	)
}
