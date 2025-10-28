import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { slug, toNiceCsvDate } from '~/utils'
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
	customComponents,
	...props
}: IChartProps) {
	const id = useId()

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
					markLine: {
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
						markLine: {
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

			for (const { date, ...item } of chartData) {
				const sumOfTheDay = Object.values(item).reduce((acc: number, curr: number) => (acc += curr), 0) as number

				for (const stack of chartsStack) {
					if ((legendOptions && customLegendName ? legendOptions.includes(stack) : true) && series[stack]) {
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

		chartInstance.setOption({
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

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [defaultChartSettings, series, chartOptions, expandTo100Percent, hideLegend, hideDataZoom, id, chartsStack])

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

	const legendTitle = customLegendName === 'Category' && legendOptions.length > 1 ? 'Categories' : customLegendName

	const showLegend = customLegendName && customLegendOptions?.length > 1 ? true : false

	const prepareCsv = useCallback(() => {
		let rows = []
		if (!chartsStack || chartsStack.length === 0) {
			rows = [['Timestamp', 'Date', 'Value']]
			for (const [date, value] of chartData ?? []) {
				rows.push([date, toNiceCsvDate(date), value])
			}
		} else {
			rows = [['Timestamp', 'Date', ...chartsStack]]
			for (const item of chartData ?? []) {
				const { date, ...rest } = item
				rows.push([date, toNiceCsvDate(date), ...chartsStack.map((stack) => rest[stack] ?? '')])
			}
		}
		const Mytitle = title ? slug(title) : 'data'
		const filename = `area-chart-${Mytitle}-${new Date().toISOString().split('T')[0]}.csv`
		return { filename, rows }
	}, [chartData, chartsStack, title])

	return (
		<div className="relative" {...props}>
			{title || showLegend || !hideDownloadButton ? (
				<div className="mb-2 flex items-center justify-end gap-2 px-2">
					{title && <h1 className="mr-auto text-lg font-bold">{title}</h1>}
					{customComponents ?? null}
					{customLegendName && customLegendOptions?.length > 1 && (
						<SelectWithCombobox
							allValues={customLegendOptions}
							selectedValues={legendOptions}
							setSelectedValues={setLegendOptions}
							selectOnlyOne={(newOption) => {
								setLegendOptions([newOption])
							}}
							label={legendTitle}
							clearAll={() => setLegendOptions([])}
							toggleAll={() => setLegendOptions(customLegendOptions)}
							labelType="smol"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
							}}
							portal
						/>
					)}
					{hideDownloadButton ? null : <CSVDownloadButton prepareCsv={prepareCsv} smol />}
				</div>
			) : null}
			<div
				id={id}
				className={containerClassName ? containerClassName : 'mx-0 my-auto h-[360px]'}
				style={height ? { height } : undefined}
			/>
		</div>
	)
}
