import { useEffect, useId, useMemo, useState, useRef } from 'react'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { stringToColour } from '../utils'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download, toNiceCsvDate, slug } from '~/utils'

// TODO remove color prop and use stackColors by default
export default function AreaChart({
	chartData,
	stacks,
	stackColors,
	valueSymbol = '',
	title,
	color,
	hallmarks,
	highlights,
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
	hideDefaultLegend,
	hideDataZoom = false,
	hideDownloadButton = false,
	containerClassName,
	...props
}: IChartProps & { highlights?: any[] }) {
	const id = useId()

	const [legendOptions, setLegendOptions] = useState(customLegendOptions)

	const chartsStack = stacks || customLegendOptions

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		tooltipSort,
		hideLegend,
		isStackedChart,
		isThemeDark,
		hideOthersInTooltip,
		tooltipValuesRelative
	})

	const markLineData = []
	const markAreaData = []
	if (Array.isArray(highlights)) {
		highlights.forEach((hl) => {
			if (hl.type === 'vline') {
				markLineData.push({
					name: hl.label,
					xAxis: hl.timestamp * 1000,
					label: { formatter: hl.label }
				})
			} else if (hl.type === 'hline') {
				markLineData.push({
					name: hl.label,
					yAxis: hl.value,
					label: { formatter: hl.label }
				})
			} else if (hl.type === 'highlight_range') {
				markAreaData.push([
					{ xAxis: hl.start * 1000, itemStyle: { opacity: 0.15 }, label: { show: !!hl.label, formatter: hl.label } },
					{ xAxis: hl.end * 1000 }
				])
			}
		})
	}

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
				}),
				...(markLineData.length > 0 && {
					markLine: { ...(hallmarks ? {} : {}), data: markLineData }
				}),
				...(markAreaData.length > 0 && {
					markArea: { data: markAreaData }
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
					}),
					...(markLineData.length > 0 && {
						markLine: { ...(hallmarks ? {} : {}), data: markLineData }
					}),
					...(markAreaData.length > 0 && {
						markArea: { data: markAreaData }
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
		highlights,
		isThemeDark,
		legendOptions,
		stackColors,
		expandTo100Percent,
		isStackedChart,
		hideGradient
	])

	const chartRef = useRef<echarts.ECharts | null>(null)

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let chartInstance = echarts.getInstanceByDom(chartDom)
		if (!chartInstance) {
			chartInstance = echarts.init(chartDom)
		}
		chartRef.current = chartInstance

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, dataZoom, legend } = defaultChartSettings

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
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

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
		}
	}, [id])

	const legendTitle = customLegendName === 'Category' && legendOptions.length > 1 ? 'Categories' : customLegendName

	return (
		<div className="relative" {...props}>
			<div className="flex justify-end items-center gap-2 mb-2 px-2">
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
								'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium'
						}}
						portal
					/>
				)}
				{hideDownloadButton ? null : (
					<CSVDownloadButton
						onClick={() => {
							try {
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
								download(filename, rows.map((r) => r.join(',')).join('\n'))
							} catch (error) {
								console.error('Error generating CSV:', error)
							}
						}}
						smol
						className="!bg-transparent border border-[var(--form-control-border)] !text-[#666] dark:!text-[#919296] hover:!bg-[var(--link-hover-bg)] focus-visible:!bg-[var(--link-hover-bg)]"
					/>
				)}
			</div>
			<div
				id={id}
				className={containerClassName ? containerClassName : 'min-h-[360px] my-auto mx-0'}
				style={height ? { height } : undefined}
			/>
		</div>
	)
}
