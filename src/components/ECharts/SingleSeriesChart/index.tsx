import { useEffect, useId, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import type { ISingleSeriesChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { mergeDeep, stringToColour } from '../utils'

export default function SingleSeriesChart({
	chartName = '',
	chartType,
	chartData,
	valueSymbol = '',
	color,
	hallmarks,
	tooltipSort = true,
	tooltipValuesRelative,
	chartOptions,
	height,
	expandTo100Percent = false,
	isStackedChart,
	hideOthersInTooltip,
	hideLegend = true,
	hideDataZoom = false,
	symbolOnChart = 'none',
	onReady
}: ISingleSeriesChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		valueSymbol,
		tooltipSort,
		hideLegend,
		isStackedChart,
		isThemeDark,
		hideOthersInTooltip,
		tooltipValuesRelative
	})

	const series = useMemo(() => {
		const chartColor = color || stringToColour()

		const series = {
			name: chartName || '',
			type: chartType,
			stack: 'value',
			emphasis: {
				focus: 'series',
				shadowBlur: 10
			},
			symbol: symbolOnChart || 'none',
			itemStyle: {
				color: chartColor
			},
			areaStyle: {
				color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
					{
						offset: 0,
						color: chartColor
					},
					{
						offset: 1,
						color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
					}
				])
			},
			data: chartData.map(([timestamp, value, ...rest]) => [+timestamp * 1e3, value, ...rest]),
			...(hallmarks && {
				markLine:
					hallmarks.length > 8
						? {
								symbol: 'none',
								data: hallmarks.map(([date, event]) => [
									{
										name: event,
										xAxis: +date * 1e3,
										yAxis: 0,
										label: {
											show: false,
											color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
											fontFamily: 'sans-serif',
											fontSize: 14,
											fontWeight: 500,
											position: 'insideEndTop'
										},
										emphasis: {
											label: {
												show: true, // Show on hover
												color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
												fontFamily: 'sans-serif',
												fontSize: 14,
												fontWeight: 500,
												position: 'insideEndTop'
											}
										}
									},
									{
										name: 'end',
										xAxis: +date * 1e3,
										yAxis: 'max',
										y: 0
									}
								])
							}
						: {
								data: hallmarks.map(([date, event], index) => [
									{
										name: event,
										xAxis: +date * 1e3,
										yAxis: 0,
										label: {
											color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
											fontFamily: 'sans-serif',
											fontSize: 14,
											fontWeight: 500
										}
									},
									{
										name: 'end',
										xAxis: +date * 1e3,
										yAxis: 'max',
										y: Math.max(hallmarks.length * 40 - index * 40, 40)
									}
								])
							}
			})
		}

		return series
	}, [chartData, color, hallmarks, isThemeDark, chartType, chartName, symbolOnChart])

	const chartRef = useRef<echarts.ECharts | null>(null)

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let chartInstance = echarts.getInstanceByDom(chartDom)
		const isNewInstance = !chartInstance
		if (!chartInstance) {
			chartInstance = echarts.init(chartDom)
		}
		chartRef.current = chartInstance

		if (onReady && isNewInstance) {
			onReady(chartInstance)
		}

		// override default chart settings
		for (const option in chartOptions) {
			if (option === 'overrides') {
				// update tooltip formatter
				defaultChartSettings['tooltip'] = { ...defaultChartSettings['inflowsTooltip'] }
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = mergeDeep(defaultChartSettings[option], chartOptions[option])
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, titleDefaults, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

		chartInstance.setOption({
			graphic,
			tooltip,
			title: titleDefaults,
			grid: {
				left: 12,
				bottom: hideDataZoom ? 12 : 68,
				top: 12,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			xAxis,
			yAxis: {
				...yAxis,
				...(expandTo100Percent ? { max: 100, min: 0 } : {})
			},
			...(!hideDataZoom ? { dataZoom } : {}),
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
	}, [id, defaultChartSettings, series, chartOptions, expandTo100Percent, hideDataZoom])

	useEffect(() => {
		return () => {
			const chartDom = document.getElementById(id)
			if (chartDom) {
				const chartInstance = echarts.getInstanceByDom(chartDom)
				if (chartInstance) {
					chartInstance.dispose()
				}
			}
			if (chartRef.current) {
				chartRef.current = null
			}
			if (onReady) {
				onReady(null)
			}
		}
	}, [id])

	return <div id={id} className="h-[360px]" style={height ? { height } : undefined}></div>
}
