import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { getUtcDateObject, stringToColour } from '../utils'
import { SelectLegendMultiple } from '../shared'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

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
	height = '360px',
	expandTo100Percent = false,
	...props
}: IChartProps) {
	const id = useMemo(() => uuid(), [])

	const [legendOptions, setLegendOptions] = useState(customLegendOptions)

	const chartsStack = stacks || customLegendOptions

	const [isDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		tooltipSort,
		hideLegend: true
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
							color: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
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
									color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
									fontFamily: 'inter, sans-serif',
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

			chartData.forEach(([date, value]) => {
				series.data.push([getUtcDateObject(date), value])
			})

			return series
		} else {
			const series = chartsStack.map((token, index) => {
				const stackColor = stackColors?.[token]

				return {
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
					stack: undefined,
					lineStyle: undefined,
					areaStyle: {
						color: !customLegendName
							? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{
										offset: 0,
										color: stackColor ? stackColor : index === 0 ? chartColor : 'transparent'
									},
									{
										offset: 1,
										color: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
									}
							  ])
							: null
					} as { color?: echarts.graphic.LinearGradient },
					data: [],
					...(hallmarks && {
						markLine: {
							data: hallmarks.map(([date, event], index) => [
								{
									name: event,
									xAxis: getUtcDateObject(date),
									yAxis: 0,
									label: {
										color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
										fontFamily: 'inter, sans-serif',
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
			})

			chartData.forEach(({ date, ...item }) => {
				const sumOfTheDay = Object.values(item).reduce((acc, curr) => (acc += curr), 0)
				chartsStack.forEach((stack) => {
					if (legendOptions && customLegendName ? legendOptions.includes(stack) : true) {
						const serie = series.find((t) => t.name === stack)
						if (serie) {
							const rawValue = item[stack] || 0
							const value = expandTo100Percent ? (rawValue / sumOfTheDay) * 100 : rawValue
							if (expandTo100Percent) {
								serie.stack = 'A'
								serie.areaStyle = {}
								serie.lineStyle = {
									...serie.lineStyle,
									width: 0
								}
							}
							serie.data.push([getUtcDateObject(date), value])
						}
					}
				})
			})

			return series
		}
	}, [
		chartData,
		chartsStack,
		color,
		customLegendName,
		hallmarks,
		isDark,
		legendOptions,
		stackColors,
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
					: {})
			},
			dataZoom: [...dataZoom],
			series
		})
		chartInstance.on('dataZoom', function () {
			const option = chartInstance.getOption()
			const dataZoom = option.dataZoom[0]
			const start = Math.floor(dataZoom.startValue)
			const end = Math.floor(dataZoom.endValue)
			console.log(start, end)
			return { startValue: start, endValue: end }
		})
		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, defaultChartSettings, series, chartOptions, expandTo100Percent])

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
			<Wrapper id={id} style={{ height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
