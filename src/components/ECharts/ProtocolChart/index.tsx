import { useCallback, useEffect, useMemo } from 'react'
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

	const [isDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		tooltipSort,
		hideLegend: true,
		unlockTokenSymbol
	})

	const { series, yAxisByIndex } = useMemo(() => {
		const chartColor = color || stringToColour()

		const yAxisByIndex = {}

		if (stacks.includes('TVL') || stacks.includes('Mcap') || stacks.includes('FDV')) {
			yAxisByIndex['TVL+Mcap+FDV'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Token Price')) {
			yAxisByIndex['Token Price'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Volume') || stacks.includes('Fees') || stacks.includes('Revenue')) {
			yAxisByIndex['Volume+Fees+Revenue'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Unlocks')) {
			yAxisByIndex['Unlocks'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Active Users')) {
			yAxisByIndex['Active Users'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Transactions')) {
			yAxisByIndex['Transactions'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Gas Used')) {
			yAxisByIndex['Gas Used'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Median APY')) {
			yAxisByIndex['Median APY'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		const series = stacks.map((stack, index) => {
			const stackColor = stackColors[stack]

			const type = ['Volume', 'Fees', 'Revenue', 'Active Users', 'Transactions', 'Gas Used'].includes(stack)
				? 'bar'
				: 'line'

			const options = {}
			if (['TVL', 'Mcap', 'FDV'].includes(stack)) {
				options['yAxisIndex'] = yAxisByIndex['TVL+Mcap+FDV']
			} else if (['Volume', 'Fees', 'Revenue'].includes(stack)) {
				options['yAxisIndex'] = yAxisByIndex['Volume+Fees+Revenue']
			} else {
				options['yAxisIndex'] = yAxisByIndex[stack]
			}

			return {
				name: stack,
				type,
				...options,
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
			stacks.forEach((stack) => {
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

		return { series, yAxisByIndex }
	}, [chartData, stacks, color, customLegendName, hallmarks, isDark, stackColors])

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

		const yAxiss = []

		const noOffset = Object.entries(yAxisByIndex).length < 3

		Object.entries(yAxisByIndex).forEach(([type, index]: [string, number]) => {
			const options = {
				...yAxis,
				name: '',
				type: 'value',
				alignTicks: true,
				offset: noOffset || index < 2 ? 0 : (yAxiss[yAxiss.length - 1]?.offset ?? 0) + 40
			}

			if (type === 'TVL+Mcap+FDV') {
				yAxiss.push(yAxis)
			}

			if (type === 'Token Price') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Token Price']
						}
					}
				})
			}

			if (type === 'Volume+Fees+Revenue') {
				yAxiss.push({
					...options
				})
			}

			if (type === 'Unlocks') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => toK(value) + ' ' + unlockTokenSymbol
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Unlocks']
						}
					}
				})
			}

			if (type === 'Active Users') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => toK(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Active Users']
						}
					}
				})
			}

			if (type === 'Transactions') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => toK(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Transactions']
						}
					}
				})
			}

			if (type === 'Gas Used') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Gas Used']
						}
					}
				})
			}
			if (type === 'Median APY') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value}%`
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Median APY']
						}
					}
				})
			}
		})

		if (Object.entries(yAxisByIndex).length === 0) {
			yAxiss.push(yAxis)
		}

		chartInstance.setOption({
			graphic: { ...graphic },
			legend: {
				...legend,
				left: 65,
				show: stacks.length > 1
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
		stacks.length,
		chartOptions,
		unlockTokenSymbol,
		stackColors,
		yAxisByIndex
	])

	return (
		<div style={{ position: 'relative', marginTop: 16 }} {...props}>
			<Wrapper id={id} style={{ height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
