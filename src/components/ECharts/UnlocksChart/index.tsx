import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { stringToColour } from '../utils'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

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
	chartOptions,
	height,
	expandTo100Percent = false,
	isStackedChart,
	hideGradient = false,
	customYAxis = [],
	...props
}: IChartProps) {
	const id = useId()

	const [legendOptions, setLegendOptions] = useState(customLegendOptions)

	const chartsStack = stacks || customLegendOptions

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		tooltipSort,
		hideLegend: true,
		isStackedChart,
		isThemeDark
	})

	const usdChartSettings = useDefaults({
		color,
		title,
		valueSymbol: '$',
		tooltipSort,
		hideLegend: true,
		isStackedChart,
		isThemeDark
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

			chartData.forEach(([date, value]) => {
				series.data.push([+date * 1e3, value])
			})

			return series
		} else {
			const series = chartsStack.map((token, index) => {
				const stackColor = stackColors?.[token]
				const yIndex = customYAxis?.indexOf(token)

				return {
					name: token,
					type: 'line',
					emphasis: {
						focus: 'series',
						shadowBlur: 10
					},
					yAxisIndex: yIndex !== -1 ? yIndex + 1 : 0,
					symbol: 'none',
					itemStyle: {
						color: stackColor ? stackColor : index === 0 ? chartColor : null
					},
					stack: isStackedChart ? 'Total' : undefined,
					lineStyle: undefined,
					areaStyle:
						isStackedChart || yIndex !== -1
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
			})

			for (const { date, ...item } of chartData) {
				const sumOfTheDay = Object.values(item).reduce((acc: number, curr: number) => (acc += curr), 0) as number
				chartsStack.forEach((stack) => {
					if (legendOptions && customLegendName ? legendOptions.includes(stack) : true) {
						const serie = series.find((t) => t.name === stack)
						if (serie) {
							const rawValue = item[stack] || 0
							const value = expandTo100Percent ? (rawValue / sumOfTheDay) * 100 : rawValue
							if (expandTo100Percent || customYAxis?.includes(stack)) {
								serie.stack = customYAxis.indexOf(stack).toString()
								serie.lineStyle = {}
								serie.areaStyle = undefined
								serie.emphasis = undefined
								serie.markLine = undefined
							}
							if (!(customYAxis?.includes(stack) && value === 0)) {
								serie.data.push([+date * 1e3, value])
							}
						}
					}
				})
			}

			return series
		}
	}, [
		color,
		chartsStack,
		isThemeDark,
		hallmarks,
		chartData,
		stackColors,
		customYAxis,
		isStackedChart,
		hideGradient,
		customLegendName,
		legendOptions,
		expandTo100Percent
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

		chartInstance.setOption({
			graphic: { ...graphic },
			tooltip: {
				...tooltip
			},
			title: {
				...titleDefaults
			},
			grid: { ...grid },
			xAxis: {
				...xAxis
			},
			yAxis: [
				{
					...yAxis,
					show: false,
					...(expandTo100Percent
						? {
								max: 100,
								min: 0
						  }
						: {})
				},
				...customYAxis.map((name, index) => ({
					...usdChartSettings.yAxis,
					position: index === 0 ? 'left' : 'right',
					id: name,
					name,
					nameLocation: 'center',
					nameTextStyle: {
						padding: [10, 0, 40, 0],
						color: stackColors ? stackColors[name] : stringToColour()
					},
					axisLabel: {
						...usdChartSettings.yAxis.axisLabel,
						color: () => (stackColors ? stackColors[name] : stringToColour())
					}
				}))
			].filter(Boolean),
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
	}, [
		createInstance,
		defaultChartSettings,
		series,
		chartOptions,
		expandTo100Percent,
		customYAxis,
		usdChartSettings.yAxis,
		stackColors
	])

	const legendTitle = customLegendName === 'Category' && legendOptions.length > 1 ? 'Categories' : customLegendName

	return (
		<div
			className="relative *:[&[role='combobox']]:ml-auto *:[&[role='combobox']]:mr-3 *:[&[role='combobox']]:mt-3"
			{...props}
		>
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
							'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium z-10'
					}}
					portal
				/>
			)}
			<div id={id} className="min-h-[360px] my-auto" style={height ? { height } : undefined} />
		</div>
	)
}
