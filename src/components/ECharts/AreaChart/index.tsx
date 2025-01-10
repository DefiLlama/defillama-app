import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { getUtcDateObject, stringToColour } from '../utils'
import { SelectLegendMultiple } from '../shared'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'

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
	height = '360px',
	expandTo100Percent = false,
	isStackedChart,
	hideGradient = false,
	hideOthersInTooltip,
	hideLegend = true,
	hideDefaultLegend,
	...props
}: IChartProps) {
	const id = useMemo(() => crypto.randomUUID(), [])

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
								xAxis: getUtcDateObject(date),
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
								xAxis: getUtcDateObject(date),
								yAxis: 'max',
								y: Math.max(hallmarks.length * 40 - index * 40, 40)
							}
						])
					}
				})
			}

			for (const [date, value] of chartData ?? []) {
				series.data.push([getUtcDateObject(date), value])
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
									xAxis: getUtcDateObject(date),
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
									xAxis: getUtcDateObject(date),
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
						series[stack].data.push([getUtcDateObject(date), value])
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
		hideGradient
	])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, dataZoom, legend } = defaultChartSettings

		for (const option in chartOptions) {
			if (defaultChartSettings[option]) {
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
	}, [createInstance, defaultChartSettings, series, chartOptions, expandTo100Percent, hideLegend])

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
			<div id={id} style={{ height }} className="my-auto" />
		</div>
	)
}
