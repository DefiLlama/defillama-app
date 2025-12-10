import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { slug } from '~/utils'
import type { ILineAndBarChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { mergeDeep } from '../utils'

export default function LineAndBarChart({
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
	enableImageExport,
	imageExportFilename,
	imageExportTitle,
	title
}: ILineAndBarChartProps) {
	const id = useId()
	const shouldEnableExport = enableImageExport ?? !!title
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const chartInstanceRef = useRef<echarts.ECharts | null>(null)

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

		for (const stack in charts) {
			if (charts[stack].yAxisIndex != null) {
				someSeriesHasYAxisIndex = true
			}
			series.push({
				name: charts[stack].name,
				type: charts[stack].type,
				stack: expandTo100Percent ? 'A' : charts[stack].stack,
				symbol: 'none',
				large: true,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: {
					color: charts[stack].color ?? (isThemeDark ? '#000000' : '#ffffff')
				},
				areaStyle: expandTo100Percent
					? {}
					: solidChartAreaStyle
						? {
								color: charts[stack].color ?? (isThemeDark ? '#000000' : '#ffffff'),
								opacity: 0.7
							}
						: {
								color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{
										offset: 0,
										color: charts[stack].color ?? (isThemeDark ? '#000000' : '#ffffff')
									},
									{
										offset: 1,
										color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
									}
								])
							},
				lineStyle: expandTo100Percent
					? {
							width: 0
						}
					: {},
				data: charts[stack].data,
				...(charts[stack].yAxisIndex != null ? { yAxisIndex: charts[stack].yAxisIndex } : {})
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
				return {
					...item,
					yAxisIndex: item.yAxisIndex ?? 0
				}
			})
		}
		return series
	}, [charts, isThemeDark, expandTo100Percent, hallmarks, solidChartAreaStyle])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()
		chartInstanceRef.current = chartInstance

		if (shouldEnableExport) {
			handleChartReady(chartInstance)
		}

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

		const { legend, graphic, titleDefaults, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

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

		const shouldHideDataZoom = series.every((s) => s.data.length < 2) || hideDataZoom

		chartInstance.setOption({
			...(hideDefaultLegend ? {} : { legend }),
			graphic,
			tooltip,
			title: titleDefaults,
			grid: {
				left: 12,
				bottom: shouldHideDataZoom ? 12 : 68,
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
			...(shouldHideDataZoom ? {} : { dataZoom }),
			series
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
			chartInstanceRef.current = null
			if (shouldEnableExport) {
				handleChartReady(null)
			}
			if (onReady) {
				onReady(null)
			}
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
		onReady,
		shouldEnableExport,
		handleChartReady
	])

	const exportFilename = imageExportFilename || (title ? slug(title) : 'chart')
	const exportTitle = imageExportTitle || title

	return (
		<div className="relative">
			{shouldEnableExport && (
				<div className="absolute top-2 right-2 z-10">
					<ChartExportButton
						chartInstance={exportChartInstance}
						filename={exportFilename}
						title={exportTitle}
						className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) bg-(--cards-bg) px-1.5 py-1 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
						smol
					/>
				</div>
			)}
			<div id={id} className="h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
