import * as echarts from 'echarts/core'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartCleanup } from '~/hooks/useChartCleanup'
import { useChartResize } from '~/hooks/useChartResize'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { slug } from '~/utils'
import { ChartContainer } from '../ChartContainer'
import { ChartHeader } from '../ChartHeader'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { mergeDeep, stringToColour } from '../utils'

// TODO remove color prop and use stackColors by default
export default function AreaChart({
	chartData,
	stacks,
	stackColors,
	valueSymbol = '',
	title,
	color,
	hallmarks,
	customLegendName,
	customLegendOptions,
	tooltipSort = true,
	tooltipValuesRelative,
	chartOptions,
	height,
	expandTo100Percent = false,
	isStackedChart,
	hideGradient = false,
	hideOthersInTooltip,
	hideLegend = true,
	hideDataZoom = false,
	hideDownloadButton = false,
	containerClassName,
	connectNulls = false,
	onReady,
	enableImageExport,
	imageExportFilename,
	imageExportTitle,
	...props
}: IChartProps) {
	const id = useId()
	const shouldEnableCSVDownload = !hideDownloadButton
	const shouldEnableImageExport = enableImageExport ?? shouldEnableCSVDownload
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const [legendOptions, setLegendOptions] = useState(customLegendOptions)

	const chartsStack = stacks || customLegendOptions

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

		if (!chartsStack || chartsStack.length === 0) {
			const series = {
				name: '',
				type: 'line',
				stack: 'value',
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				connectNulls,
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
				data: [],
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

			for (const [date, value] of chartData ?? []) {
				series.data.push([+date * 1e3, value])
			}

			return series
		} else {
			const series = {}
			let index = 0
			for (const token of chartsStack) {
				const stackColor = stackColors?.[token]

				series[token] = {
					name: token,
					type: 'line',
					emphasis: {
						focus: 'series',
						shadowBlur: 10
					},
					symbol: 'none',
					connectNulls,
					itemStyle: {
						color: stackColor ? stackColor : index === 0 ? chartColor : null
					},
					stack: isStackedChart ? 'Total' : undefined,
					lineStyle: undefined,
					areaStyle: isStackedChart
						? {}
						: hideGradient
							? { color: 'none' }
							: ({
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
								} as { color?: echarts.graphic.LinearGradient }),
					data: [],
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
				index++
			}

			const legendOptionsSet = legendOptions ? new Set(legendOptions) : null
			for (const { date, ...item } of chartData) {
				let sumOfTheDay = 0
				for (const stack of chartsStack) {
					const rawValue = item[stack]
					if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
						sumOfTheDay += rawValue
					}
				}

				for (const stack of chartsStack) {
					if ((legendOptionsSet && customLegendName ? legendOptionsSet.has(stack) : true) && series[stack]) {
						const rawValue = item[stack] || 0

						const value = expandTo100Percent ? (sumOfTheDay ? (rawValue / sumOfTheDay) * 100 : 0) : rawValue
						if (expandTo100Percent) {
							series[stack].stack = 'A'
							series[stack].areaStyle = {}
							series[stack].lineStyle = {
								...series[stack].lineStyle,
								width: 0
							}
						}
						series[stack].data.push([+date * 1e3, value])
					}
				}
			}

			return Object.values(series)
		}
	}, [
		chartData,
		chartsStack,
		color,
		customLegendName,
		hallmarks,
		isThemeDark,
		legendOptions,
		stackColors,
		expandTo100Percent,
		isStackedChart,
		hideGradient,
		connectNulls
	])

	const chartRef = useRef<echarts.ECharts | null>(null)
	const onReadyRef = useRef(onReady)
	onReadyRef.current = onReady
	const hasNotifiedReadyRef = useRef(false)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const exportFilename = imageExportFilename || (title ? slug(title) : 'chart')
	const exportTitle = imageExportTitle || title
	const updateExportInstanceRef = useRef((instance: echarts.ECharts | null) => {
		if (shouldEnableImageExport || shouldEnableCSVDownload) handleChartReady(instance)
	})
	updateExportInstanceRef.current = (instance: echarts.ECharts | null) => {
		if (shouldEnableImageExport || shouldEnableCSVDownload) handleChartReady(instance)
	}

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let instance = echarts.getInstanceByDom(chartDom)
		const isNewInstance = !instance
		if (!instance) {
			instance = echarts.init(chartDom)
		}
		chartRef.current = instance
		updateExportInstanceRef.current(instance)

		if (onReadyRef.current && isNewInstance) {
			onReadyRef.current(instance)
			hasNotifiedReadyRef.current = true
		}

		for (const option in chartOptions) {
			if (option === 'dataZoom') {
				if (Array.isArray(chartOptions[option])) {
					if (defaultChartSettings[option]) {
						defaultChartSettings[option] = [
							{ ...defaultChartSettings[option][0], ...(chartOptions[option][0] ?? {}) },
							{ ...defaultChartSettings[option][1], ...(chartOptions[option][1] ?? {}) }
						]
					} else {
						defaultChartSettings[option] = chartOptions[option]
					}
				}
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = mergeDeep(defaultChartSettings[option], chartOptions[option])
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { grid, graphic, tooltip, xAxis, yAxis, dataZoom, legend } = defaultChartSettings

		instance.setOption({
			graphic,
			tooltip,
			grid,
			xAxis,
			yAxis: {
				...yAxis,
				...(expandTo100Percent
					? {
							max: 100,
							min: 0
						}
					: {}),
				...(chartOptions?.['yAxis'] ?? {})
			},
			...(!hideLegend && {
				legend: {
					...legend,
					data: chartsStack
				}
			}),
			dataZoom: hideDataZoom ? [] : [...dataZoom],
			series
		})
	}, [defaultChartSettings, series, chartOptions, expandTo100Percent, hideLegend, hideDataZoom, id, chartsStack])

	useChartCleanup(id, () => {
		chartRef.current = null
		if (hasNotifiedReadyRef.current) {
			onReadyRef.current?.(null)
			hasNotifiedReadyRef.current = false
		}
		updateExportInstanceRef.current(null)
	})

	const legendTitle = customLegendName === 'Category' && legendOptions.length > 1 ? 'Categories' : customLegendName

	const showLegend = !!(customLegendName && customLegendOptions?.length > 1)
	const showHeader = !!(title || showLegend || !hideDownloadButton || shouldEnableImageExport)

	return (
		<ChartContainer
			id={id}
			chartClassName={containerClassName ?? 'mx-0 my-auto h-[360px]'}
			chartStyle={height ? { height } : undefined}
			header={
				showHeader ? (
					<ChartHeader
						title={title}
						customComponents={
							customLegendName && customLegendOptions?.length > 1 ? (
								<SelectWithCombobox
									allValues={customLegendOptions}
									selectedValues={legendOptions}
									setSelectedValues={setLegendOptions}
									label={legendTitle}
									labelType="smol"
									variant="filter"
									portal
								/>
							) : null
						}
						exportButtons={
							<ChartExportButtons
								chartInstance={chartInstance}
								filename={exportFilename}
								title={exportTitle}
								showCsv={shouldEnableCSVDownload}
								showPng={shouldEnableImageExport}
							/>
						}
					/>
				) : null
			}
			{...props}
		/>
	)
}
