import { useCallback, useEffect, useId, useMemo } from 'react'
import { DatasetComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { abbreviateNumber } from '~/utils'
import type { IMultiSeriesChart2Props } from '../types'
import { formatTooltipChartDate, useDefaults } from '../useDefaults'
import { mergeDeep } from '../utils'

echarts.use([DatasetComponent])

export default function MultiSeriesChart2({
	charts,
	chartOptions,
	height,
	hallmarks,
	expandTo100Percent,
	valueSymbol = '$',
	groupBy,
	alwaysShowTooltip,
	solidChartAreaStyle = false,
	hideDataZoom,
	onReady,
	hideDefaultLegend = true,
	data,
	selectedCharts
}: IMultiSeriesChart2Props) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		isThemeDark,
		valueSymbol,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly')
				: 'daily',
		alwaysShowTooltip
	})

	const series = useMemo(() => {
		const series = []

		let someSeriesHasYAxisIndex = false

		for (const chart of charts ?? []) {
			if (selectedCharts && !selectedCharts.has(chart.name)) continue
			if (chart.yAxisIndex != null) {
				someSeriesHasYAxisIndex = true
			}
			series.push({
				name: chart.name,
				type: chart.type,
				symbol: 'none',
				large: true,
				encode: chart.encode,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: {
					color: chart.color ?? (isThemeDark ? '#000000' : '#ffffff')
				},
				...(expandTo100Percent
					? { stack: 'A', lineStyle: { width: 0 } }
					: {
							stack: chart.stack,
							areaStyle: solidChartAreaStyle
								? {
										color: chart.color ?? (isThemeDark ? '#000000' : '#ffffff'),
										opacity: 0.7
									}
								: {
										color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
											{
												offset: 0,
												color: chart.color ?? (isThemeDark ? '#000000' : '#ffffff')
											},
											{
												offset: 1,
												color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
											}
										])
									}
						}),
				...(chart.yAxisIndex != null ? { yAxisIndex: chart.yAxisIndex } : {})
			})
		}
		if (hallmarks) {
			series[0].markLine =
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
		}
		if (someSeriesHasYAxisIndex) {
			return series.map((item) => {
				item.yAxisIndex = item.yAxisIndex ?? 0
				return item
			})
		}
		return series
	}, [charts, isThemeDark, expandTo100Percent, hallmarks, solidChartAreaStyle, selectedCharts])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		if (onReady) {
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

		const { legend, graphic, titleDefaults, xAxis, yAxis, dataZoom } = defaultChartSettings

		const finalYAxis = []
		if (series.some((item) => item.yAxisIndex != null)) {
			// Collect all unique yAxisIndex values from series and map them to colors
			const yAxisIndexToColor = new Map<number, string | undefined>()

			series.forEach((item) => {
				if (item.yAxisIndex != null) {
					// Map each yAxisIndex to the color of the first series that uses it
					if (!yAxisIndexToColor.has(item.yAxisIndex)) {
						const seriesColor = item.itemStyle?.color
						yAxisIndexToColor.set(item.yAxisIndex, seriesColor)
					}
				}
			})

			// Create yAxis objects for each index from 0 to max
			if (yAxisIndexToColor.size > 0) {
				const maxIndex = Math.max(...Array.from(yAxisIndexToColor.keys()))
				for (let i = 0; i <= maxIndex; i++) {
					const axisColor = i === 0 ? null : yAxisIndexToColor.get(i)
					finalYAxis.push({
						...yAxis,
						axisLine: {
							show: true,
							lineStyle: {
								type: [5, 10],
								dashOffset: 5,
								...(axisColor ? { color: axisColor } : {})
							}
						},
						axisLabel: {
							...yAxis.axisLabel,
							...(axisColor ? { color: axisColor } : {})
						},
						...(expandTo100Percent ? { max: 100, min: 0 } : {})
					})
				}
			}
		}

		chartInstance.setOption({
			...(hideDefaultLegend ? {} : { legend }),
			graphic,
			tooltip: {
				trigger: 'axis',
				confine: true,
				formatter: (params: any) => {
					let chartdate = formatTooltipChartDate(params[0].axisValue, groupBy)

					let vals = params
						.map((param) => {
							const name = param.dimensionNames[param.componentIndex]
							// first value is the date
							const value = param.value[param.componentIndex + 1]
							if (value == null) return null
							return [param.marker, name, value]
						})
						.filter(Boolean)
						.sort((a, b) => b[2] - a[2])

					return (
						chartdate +
						vals.reduce(
							(prev, curr) =>
								prev +
								`<li style="list-style:none;">${curr[0]} ${curr[1]}: ${abbreviateNumber(curr[2], 2, valueSymbol)}</li>`,
							''
						)
					)
				}
			},
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
			yAxis:
				finalYAxis.length > 0
					? finalYAxis
					: {
							...yAxis,
							...(expandTo100Percent ? { max: 100, min: 0 } : {})
						},
			...(!hideDataZoom ? { dataZoom } : {}),
			series,
			dataset: {
				source: data,
				dimensions:
					charts?.map((chart) => chart.name)?.filter((name) => (selectedCharts ? selectedCharts.has(name) : true)) ?? []
			}
		})

		if (alwaysShowTooltip) {
			chartInstance.dispatchAction({
				type: 'showTip',
				// index of series, which is optional when trigger of tooltip is axis
				seriesIndex: 0,
				// data index; could assign by name attribute when not defined
				dataIndex: series[0].data.length - 1,
				// Position of tooltip. Only works in this action.
				// Use tooltip.position in option by default.
				position: [60, 0]
			})

			chartInstance.on('globalout', () => {
				chartInstance.dispatchAction({
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
		chartOptions,
		expandTo100Percent,
		alwaysShowTooltip,
		hideDataZoom,
		hideDefaultLegend,
		data,
		charts,
		groupBy,
		valueSymbol,
		selectedCharts
	])

	return <div id={id} className="h-[360px]" style={height ? { height } : undefined}></div>
}
