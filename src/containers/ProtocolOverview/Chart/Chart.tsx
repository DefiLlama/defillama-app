import { useCallback, useEffect, useId, useMemo } from 'react'
import { MarkAreaComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { mergeDeep } from '~/components/ECharts/utils'
import { formattedNum } from '~/utils'
import { BAR_CHARTS, ProtocolChartsLabels, yAxisByChart } from './constants'

const customOffsets = {
	Contributors: 60,
	'Contributors Commits': 80,
	'Devs Commits': 70,
	'NFT Volume': 65
}

echarts.use([MarkAreaComponent])

export default function ProtocolLineBarChart({
	chartData,
	chartColors,
	valueSymbol = '',
	color,
	hallmarks,
	rangeHallmarks,
	chartOptions,
	height,
	unlockTokenSymbol = '',
	isThemeDark,
	groupBy,
	isLogScale = false,
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
		) as Record<ProtocolChartsLabels, number | undefined>

		const series = stacks.map((stack, index) => {
			const stackColor = chartColors[stack]

			let type = BAR_CHARTS.includes(stack) && !isCumulative ? 'bar' : 'line'

			const options = {
				yAxisIndex: indexByYAxis[yAxisByChart[stack]]
			}

			return {
				name: stack,
				type,
				...options,
				scale: true,
				large: true,
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
										color: stackColor ? stackColor : index === 0 ? chartColors[stack] : 'transparent'
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
				data: chartData[stack] ?? [],
				...(index === 0 && rangeHallmarks?.length > 0
					? {
							markArea: {
								itemStyle: {
									color: isThemeDark ? 'rgba(15, 52, 105, 0.4)' : 'rgba(70, 130, 180, 0.3)'
								},
								label: {
									fontFamily: 'sans-serif',
									fontWeight: 600,
									color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
								},
								data: rangeHallmarks.map(([date, event]) => [
									{
										name: event,
										xAxis: date[0]
									},
									{
										xAxis: date[1]
									}
								])
							}
						}
					: {})
			}
		})

		if (series.length > 0 && hallmarks?.length > 0) {
			series[0] = {
				...series[0],
				markLine: {
					data: hallmarks.map(([date, event], index) => [
						{
							name: event,
							xAxis: date,
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
							xAxis: date,
							yAxis: 'max',
							y: Math.max(hallmarks.length * 20 - index * 20, 20)
						}
					])
				}
			}
		}

		for (const seriesItem of series) {
			if (seriesItem.data.length === 0) {
				seriesItem.large = false
			}
		}

		return {
			series,
			allYAxis: Object.entries(indexByYAxis) as Array<[ProtocolChartsLabels, number | undefined]>
		}
	}, [chartData, chartColors, hallmarks, isThemeDark, isCumulative, rangeHallmarks])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, tooltip, xAxis, yAxis: defaultYAxis, dataZoom } = defaultChartSettings

		for (const option in chartOptions) {
			if (defaultChartSettings[option]) {
				defaultChartSettings[option] = mergeDeep(defaultChartSettings[option], chartOptions[option])
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const finalYAxis = []

		const noOffset = allYAxis.length < 3

		const chartsInSeries = new Set(series.map((s) => s.name))

		allYAxis.forEach(([type, index]) => {
			const options = {
				...defaultYAxis,
				name: '',
				type: 'value',
				alignTicks: true,
				offset:
					noOffset || index == null || index < 2
						? 0
						: (finalYAxis[finalYAxis.length - 1]?.offset ?? 0) + (customOffsets[type] || 40)
			}

			if (type === 'TVL') {
				finalYAxis.push(defaultYAxis)
			}

			if (type === 'Token Price') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Token Price']
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
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Token Volume']
						}
					}
				})
			}

			if (type === 'Token Liquidity') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Token Liquidity']
						}
					}
				})
			}

			if (type === 'Bridge Deposits') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Bridge Deposits']
						}
					}
				})
			}

			if (type === 'Fees') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartsInSeries.has('Fees')
								? chartColors['Fees']
								: chartsInSeries.has('Revenue')
									? chartColors['Revenue']
									: chartsInSeries.has('Holders Revenue')
										? chartColors['Holders Revenue']
										: chartsInSeries.has('Incentives')
											? chartColors['Incentives']
											: chartColors['Fees']
						}
					}
				})
			}

			if (type === 'DEX Volume') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartsInSeries.has('DEX Volume')
								? chartColors['DEX Volume']
								: chartsInSeries.has('Perp Volume')
									? chartColors['Perp Volume']
									: chartsInSeries.has('Options Premium Volume')
										? chartColors['Options Premium Volume']
										: chartsInSeries.has('Options Notional Volume')
											? chartColors['Options Notional Volume']
											: chartsInSeries.has('Perp Aggregator Volume')
												? chartColors['Perp Aggregator Volume']
												: chartsInSeries.has('Bridge Aggregator Volume')
													? chartColors['Bridge Aggregator Volume']
													: chartsInSeries.has('DEX Aggregator Volume')
														? chartColors['DEX Aggregator Volume']
														: chartColors['DEX Volume']
						}
					}
				})
			}

			if (type === 'Open Interest') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Open Interest']
						}
					}
				})
			}

			if (type === 'Unlocks') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => `${formattedNum(value)} ${unlockTokenSymbol}`
					},
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Unlocks']
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
							type: [5, 10],
							dashOffset: 5,
							color: chartsInSeries.has('Active Addresses')
								? chartColors['Active Addresses']
								: chartsInSeries.has('New Addresses')
									? chartColors['New Addresses']
									: chartColors['Active Addresses']
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
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Transactions']
						}
					}
				})
			}

			if (type === 'Gas Used') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Gas Used']
						}
					}
				})
			}
			if (type === 'Median APY') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value}%`
					},
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Median APY']
						}
					}
				})
			}

			if (type === 'USD Inflows') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['USD Inflows']
						}
					}
				})
			}

			if (type === 'Total Proposals') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => formattedNum(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Total Proposals']
						}
					}
				})
			}

			if (type === 'Max Votes') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => formattedNum(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Max Votes']
						}
					}
				})
			}

			if (type === 'Treasury') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Treasury']
						}
					}
				})
			}

			if (type === 'Tweets') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value} tweets`
					},
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['Tweets']
						}
					}
				})
			}

			if (type === 'NFT Volume') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							type: [5, 10],
							dashOffset: 5,
							color: chartColors['NFT Volume']
						}
					}
				})
			}
		})

		if (allYAxis.length === 0) {
			finalYAxis.push(defaultYAxis)
		}

		const yAxis = !isLogScale
			? finalYAxis
			: finalYAxis.map((axis) => ({
					...axis,
					type: 'log',
					startValue: 1
				}))

		chartInstance.setOption({
			graphic,
			tooltip,
			grid: {
				left: 12,
				bottom: 68,
				top: rangeHallmarks?.length > 0 ? 18 : 12,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			xAxis,
			yAxis: yAxis,
			...(series.every((s) => s.data.length > 1) ? { dataZoom } : {}),
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
		unlockTokenSymbol,
		chartColors,
		allYAxis,
		rangeHallmarks,
		height,
		isLogScale
	])

	return (
		<div
			id={id}
			className="min-h-[360px]"
			style={height || props.style ? { height, ...(props.style ?? {}) } : undefined}
		/>
	)
}
