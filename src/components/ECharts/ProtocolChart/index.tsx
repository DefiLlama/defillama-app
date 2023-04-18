import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { getUtcDateObject, stringToColour } from '../utils'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { toK } from '~/utils'

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

export default function AreaBarChart({
	chartData,
	stacks,
	stackColors = {},
	valueSymbol = '',
	title,
	color,
	hallmarks,
	customLegendName,
	customLegendOptions,
	tooltipSort = true,
	chartOptions,
	height = '360px',
	unlockTokenSymbol = '',
	...props
}: IChartProps) {
	const id = useMemo(() => uuid(), [])

	const chartsStack = stacks || customLegendOptions

	const [isDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		tooltipSort,
		hideLegend: true,
		unlockTokenSymbol
	})

	const barChartExists = chartsStack.find((st) => ['Volume', 'Fees', 'Revenue', 'Revenue'].includes(st)) ? true : false
	const unlockChartExists = chartsStack.includes('Unlocks')
	const activeUsersChartExists = chartsStack.includes('Active Users')
	const unlockStackColor = stackColors['Unlocks']
	const activeUsersStackColor = stackColors['Active Users']

	const series = useMemo(() => {
		const chartColor = color || stringToColour()

		const barChartStacks = chartsStack.filter((st) =>
			['Volume', 'Fees', 'Revenue', 'Revenue', 'Active Users'].includes(st)
		)

		const series = chartsStack.map((token, index) => {
			const stackColor = stackColors[token]

			const type = barChartStacks.includes(token) || token === 'Active Users' ? 'bar' : 'line'

			const yAxisIndex = {}
			if (chartsStack.length > 0) {
				if (type === 'bar') {
					if (token === 'Active Users') {
						if (barChartStacks.length > 1) {
							if (chartsStack.includes('Unlocks')) {
								yAxisIndex['yAxisIndex'] = 3
							} else {
								yAxisIndex['yAxisIndex'] = 2
							}
						} else {
							yAxisIndex['yAxisIndex'] = 1
						}
					} else {
						yAxisIndex['yAxisIndex'] = 1
					}
				} else {
					if (token === 'Unlocks') {
						if (barChartStacks.length > 0) {
							yAxisIndex['yAxisIndex'] = 2
						} else {
							yAxisIndex['yAxisIndex'] = 1
						}
					} else {
						yAxisIndex['yAxisIndex'] = 0
					}
				}
			}

			return {
				name: token,
				type,
				...yAxisIndex,
				scale: true,
				large: true,
				largeThreshold: 0,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: stackColor || null
				},
				...(type === 'line' && {
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
					}
				}),
				markLine: {},
				data: []
			}
		})

		chartData.forEach(({ date, ...item }) => {
			chartsStack.forEach((stack) => {
				series.find((t) => t.name === stack)?.data.push([getUtcDateObject(date), item[stack] || 0])
			})
		})

		if (series.length > 0 && hallmarks) {
			series[0] = {
				...series[0],
				markLine: {
					data: hallmarks.map(([date, event], index) => [
						{
							name: event,
							xAxis: getUtcDateObject(date),
							yAxis: 0,
							label: {
								color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
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
			}
		}

		return series
	}, [chartData, chartsStack, color, customLegendName, hallmarks, isDark, stackColors])

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

		delete dataZoom[1].right

		const yAxiss: any = [yAxis]

		if (barChartExists) {
			yAxiss.push({ ...yAxis, type: 'value' })
		}

		if (unlockChartExists) {
			yAxiss.push({
				...yAxis,
				name: '',
				type: 'value',
				position: 'right',
				alignTicks: true,
				offset: barChartExists ? 60 : 10,
				axisLabel: {
					formatter: (value) => toK(value) + ' ' + unlockTokenSymbol
				},
				axisLine: {
					show: true,
					lineStyle: {
						color: unlockStackColor
					}
				}
			})
		}

		if (activeUsersChartExists) {
			yAxiss.push({
				...yAxis,
				name: '',
				type: 'value',
				position: 'right',
				alignTicks: true,
				offset: barChartExists && unlockChartExists ? 80 : barChartExists || unlockChartExists ? 40 : 10,
				axisLabel: {
					formatter: (value) => toK(value)
				},
				axisLine: {
					show: true,
					lineStyle: {
						color: activeUsersStackColor
					}
				}
			})
		}

		chartInstance.setOption({
			graphic: { ...graphic },
			legend: {
				...legend,
				left: 65,
				show: chartsStack.length > 1
			},
			tooltip: {
				...tooltip
			},
			title: {
				...titleDefaults
			},
			grid: {
				...grid,
				top: 40
			},
			xAxis: {
				...xAxis
			},
			yAxis: yAxiss,
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
		chartsStack.length,
		unlockTokenSymbol,
		barChartExists,
		unlockChartExists,
		unlockStackColor,
		activeUsersChartExists,
		activeUsersStackColor
	])

	return (
		<div style={{ position: 'relative', marginTop: 16 }} {...props}>
			<Wrapper id={id} style={{ height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
