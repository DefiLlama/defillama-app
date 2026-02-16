import { MarkAreaComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import * as React from 'react'
import { useEffect, useId, useMemo, useRef } from 'react'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { mergeDeep } from '~/components/ECharts/utils'
import { useChartResize } from '~/hooks/useChartResize'
import { formattedNum } from '~/utils'
import { BAR_CHARTS, type ProtocolChartsLabels, yAxisByChart } from './constants'

const customOffsets: Record<string, number> = {
	Contributors: 60,
	'Contributors Commits': 80,
	'Devs Commits': 70,
	'NFT Volume': 65
}

echarts.use([MarkAreaComponent])

export interface IProtocolCoreChartProps {
	chartData: Record<string, Array<[string | number, number | null]>>
	chartColors: Record<string, string>
	valueSymbol?: string
	color?: string
	hallmarks: Array<[number, string]> | null
	rangeHallmarks: Array<[[number, number], string]> | null
	chartOptions?: Record<string, Record<string, unknown>>
	height?: string
	unlockTokenSymbol?: string | null
	isThemeDark: boolean
	groupBy?: string
	hideDataZoom?: boolean
	onReady?: (instance: echarts.ECharts | null) => void
	style?: React.CSSProperties
}

export default function ProtocolCoreChart({
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
	hideDataZoom = false,
	onReady,
	...props
}: IProtocolCoreChartProps) {
	const id = useId()
	const isCumulative = groupBy === 'cumulative'
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const defaultChartSettings = useDefaults({
		color,
		valueSymbol,
		tooltipSort: false,
		hideLegend: true,
		unlockTokenSymbol: unlockTokenSymbol ?? '',
		isThemeDark,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly')
				: 'daily'
	})

	const { series, allYAxis } = useMemo(() => {
		const uniqueYAxis = new Set()

		const stacks = Object.keys(chartData) as ProtocolChartsLabels[]

		for (const stack of stacks) {
			uniqueYAxis.add(yAxisByChart[stack])
		}

		const indexByYAxis = Object.fromEntries(
			Array.from(uniqueYAxis).map((yAxis, index) => [yAxis, index === 0 ? undefined : index])
		) as Record<string, number | undefined>

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
				...(index === 0 && (rangeHallmarks?.length ?? 0) > 0
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
								data: (rangeHallmarks ?? []).map(([date, event]: [[number, number], string]) => [
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

		if (series.length > 0 && (hallmarks?.length ?? 0) > 0) {
			series[0] = {
				...series[0],
				markLine: {
					data: (hallmarks ?? []).map(([date, event]: [number, string], index: number) => [
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
							y: Math.max((hallmarks?.length ?? 0) * 20 - index * 20, 20)
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

	useEffect(() => {
		// create instance
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance
		if (onReady) {
			onReady(instance)
		}

		const mergedSettings = { ...defaultChartSettings } as Record<string, unknown>
		if (chartOptions) {
			for (const option of Object.keys(chartOptions)) {
				const opts = chartOptions as Record<string, Record<string, unknown>>
				if (mergedSettings[option]) {
					mergedSettings[option] = mergeDeep(mergedSettings[option] as Record<string, unknown>, opts[option])
				} else {
					mergedSettings[option] = { ...opts[option] }
				}
			}
		}

		const { graphic, tooltip, xAxis, yAxis, dataZoom } = mergedSettings as typeof defaultChartSettings

		const finalYAxis: Array<Record<string, unknown>> = []

		const noOffset = allYAxis.length < 3

		const chartsInSeries = new Set(series.map((s) => s.name))

		for (const [type, index] of allYAxis) {
			const prevOffset = (finalYAxis[finalYAxis.length - 1]?.offset as number | undefined) ?? 0
			const options: Record<string, unknown> = {
				...yAxis,
				name: '',
				type: 'value',
				alignTicks: true,
				offset: noOffset || index == null || index < 2 ? 0 : prevOffset + (customOffsets[type] ?? 40)
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
						formatter: (value: number) => `${formattedNum(value)} ${unlockTokenSymbol}`
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
						formatter: (value: number) => formattedNum(value)
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
						formatter: (value: number) => formattedNum(value)
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
						formatter: (value: number) => `${value}%`
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
						formatter: (value: number) => formattedNum(value)
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
						formatter: (value: number) => formattedNum(value)
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
						formatter: (value: number) => `${value} tweets`
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
		}

		if (allYAxis.length === 0) {
			finalYAxis.push(yAxis)
		}

		instance.setOption({
			graphic,
			tooltip,
			grid: {
				left: 12,
				bottom: hideDataZoom ? 12 : 68,
				top: (rangeHallmarks?.length ?? 0) > 0 ? 18 : 12,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			xAxis,
			yAxis: finalYAxis,
			...(series.every((s) => s.data.length > 1) ? { dataZoom } : {}),
			series
		})

		return () => {
			chartRef.current = null
			instance.dispose()
			if (onReady) {
				onReady(null)
			}
		}
	}, [
		id,
		defaultChartSettings,
		series,
		chartOptions,
		unlockTokenSymbol,
		chartColors,
		allYAxis,
		rangeHallmarks,
		onReady,
		hideDataZoom
	])

	return (
		<div
			id={id}
			className="h-[360px]"
			style={height || props.style ? { height: height ?? '360px', ...(props.style ?? {}) } : undefined}
		/>
	)
}
