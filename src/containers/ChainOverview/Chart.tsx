import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { formattedNum, getRandomColor } from '~/utils'
import {
	ChainChartLabels,
	BAR_CHARTS,
	yAxisByChart,
	DISABLED_CUMULATIVE_CHARTS,
	chainOverviewChartColors
} from './constants'

const customOffsets = {}

export default function ChainLineBarChart({
	chartData,
	valueSymbol = '',
	color,
	chartOptions,
	height,
	unlockTokenSymbol = '',
	isThemeDark,
	groupBy,
	...props
}) {
	const id = useId()
	const isCumulative = groupBy === 'cumulative'

	const defaultChartSettings = useDefaults({
		color,
		valueSymbol,
		tooltipSort: false,
		hideLegend: true,
		unlockTokenSymbol,
		isThemeDark,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly')
				: 'daily'
	})

	const { series, allYAxis } = useMemo(() => {
		const uniqueYAxis = new Set()

		const stacks = Object.keys(chartData) as any

		for (const stack of stacks) {
			uniqueYAxis.add(yAxisByChart[stack])
		}

		const indexByYAxis = Object.fromEntries(
			Array.from(uniqueYAxis).map((yAxis, index) => [yAxis, index === 0 ? undefined : index])
		) as Record<ChainChartLabels, number | undefined>

		const series = stacks.map((stack, index) => {
			const stackColor = chainOverviewChartColors[stack] || getRandomColor()

			let type = BAR_CHARTS.includes(stack) && !isCumulative ? 'bar' : 'line'
			type = DISABLED_CUMULATIVE_CHARTS.includes(stack) ? 'bar' : type

			const options = {
				yAxisIndex: indexByYAxis[yAxisByChart[stack]]
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
				...(type === 'line'
					? {
							areaStyle: {
								color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{
										offset: 0,
										color: stackColor ? stackColor : index === 0 ? chainOverviewChartColors[stack] : 'transparent'
									},
									{
										offset: 1,
										color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
									}
								])
							}
					  }
					: {}),
				markLine: {},
				data: chartData[stack] ?? []
			}
		})

		for (const seriesItem of series) {
			if (seriesItem.data.length === 0) {
				seriesItem.large = false
			}
		}

		return {
			series,
			allYAxis: Object.entries(indexByYAxis) as Array<[ChainChartLabels, number | undefined]>
		}
	}, [chartData, isThemeDark, isCumulative])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

		for (const option in chartOptions) {
			if (defaultChartSettings[option]) {
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const finalYAxis = []

		const noOffset = allYAxis.length < 3

		allYAxis.forEach(([type, index]) => {
			const options = {
				...yAxis,
				name: '',
				type: 'value',
				alignTicks: true,
				offset:
					noOffset || index == null || index < 2
						? 0
						: (finalYAxis[finalYAxis.length - 1]?.offset ?? 0) + (customOffsets[type] || 40)
			}

			if (type === 'TVL') {
				finalYAxis.push(yAxis)
			}

			if (type === 'Stablecoins Mcap') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Stablecoins Mcap']
						}
					}
				})
			}

			if (type === 'Chain Fees' || type === 'Chain Revenue') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chartData['Chain Fees']
								? chainOverviewChartColors['Chain Fees']
								: chartData['Chain Revenue']
								? chainOverviewChartColors['Chain Revenue']
								: chartData['App Fees']
								? chainOverviewChartColors['App Fees']
								: chainOverviewChartColors['App Revenue']
						}
					}
				})
			}

			if (type === 'DEXs Volume') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['DEXs Volume']
						}
					}
				})
			}

			if (type === 'Perps Volume') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Perps Volume']
						}
					}
				})
			}

			if (type === 'Token Incentives') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Token Incentives']
						}
					}
				})
			}

			if (type === 'Bridged TVL') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Bridged TVL']
						}
					}
				})
			}

			if (type === 'Active Addresses') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => formattedNum(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: chartData['Active Addresses']
								? chainOverviewChartColors['Active Addresses']
								: chartData['New Addresses']
								? chainOverviewChartColors['New Addresses']
								: isThemeDark
								? '#fff'
								: '#000'
						}
					}
				})
			}

			if (type === 'Transactions') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => formattedNum(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Transactions']
						}
					}
				})
			}

			if (type === 'Net Inflows') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Net Inflows']
						}
					}
				})
			}

			if (type === 'Core Developers') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value} devs`
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Core Developers']
						}
					}
				})
			}

			if (type === 'Devs Commits') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value} commits`
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Devs Commits']
						}
					}
				})
			}

			if (type === 'Token Mcap') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Token Mcap']
						}
					}
				})
			}

			if (type === 'Token Price') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Token Price']
						}
					}
				})
			}

			if (type === 'Token Volume') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Token Volume']
						}
					}
				})
			}

			if (type === 'Raises') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: chainOverviewChartColors['Raises']
						}
					}
				})
			}
		})

		if (allYAxis.length === 0) {
			finalYAxis.push(yAxis)
		}

		chartInstance.setOption({
			graphic,
			tooltip,
			grid: {
				left: 12,
				bottom: 68,
				top: 12,
				right: 12,
				containLabel: true
			},
			xAxis,
			yAxis: finalYAxis,
			dataZoom,
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
	}, [createInstance, defaultChartSettings, series, chartOptions, unlockTokenSymbol, allYAxis])

	return (
		<div
			id={id}
			className="min-h-[360px]"
			style={height || props.style ? { height, ...(props.style ?? {}) } : undefined}
		/>
	)
}
