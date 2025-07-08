import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { formattedNum } from '~/utils'
import { ProtocolChartsLabels, BAR_CHARTS, yAxisByChart, DISABLED_CUMULATIVE_CHARTS } from './constants'

const customOffsets = {
	Contributers: 60,
	'Contributers Commits': 80,
	'Devs Commits': 70,
	'NFT Volume': 65
}

export default function ProtocolLineBarChart({
	chartData,
	chartColors,
	valueSymbol = '',
	color,
	hallmarks,
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
		) as Record<ProtocolChartsLabels, number | undefined>

		const series = stacks.map((stack, index) => {
			const stackColor = chartColors[stack]

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
				data: chartData[stack] ?? []
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
	}, [chartData, chartColors, color, hallmarks, isThemeDark, isCumulative])

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

			if (type === 'Token Price') {
				finalYAxis.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
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
							color: chartColors['Fees']
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
							color: chartColors['DEX Volume']
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
							color: chartColors['Tweets']
						}
					}
				})
			}

			if (type === 'Developers') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value} devs`
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: chartColors['Developers']
						}
					}
				})
			}
			if (type === 'Contributers') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value} contributers`
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: chartColors['Contributers']
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
							color: chartColors['Devs Commits']
						}
					}
				})
			}
			if (type === 'Contributers Commits') {
				finalYAxis.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value} commits`
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: chartColors['Contributers Commits']
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
							color: chartColors['NFT Volume']
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
	}, [createInstance, defaultChartSettings, series, chartOptions, unlockTokenSymbol, chartColors, allYAxis])

	return (
		<div
			id={id}
			className="min-h-[360px]"
			style={height || props.style ? { height, ...(props.style ?? {}) } : undefined}
		/>
	)
}
