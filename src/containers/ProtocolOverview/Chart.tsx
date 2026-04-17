import { CustomChart } from 'echarts/charts'
import { MarkAreaComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { useEffect, useId, useMemo, useRef } from 'react'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import type { ChartTimeGrouping } from '~/components/ECharts/types'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { mergeDeep } from '~/components/ECharts/utils'
import { useChartResize } from '~/hooks/useChartResize'
import { formattedNum } from '~/utils'
import { BAR_CHARTS, type ProtocolChartsLabels, yAxisByChart } from './constants'
import type { IProtocolCoreChartProps } from './types'

const customOffsets: Record<string, number> = {
	Contributors: 60,
	'Contributors Commits': 80,
	'Devs Commits': 70,
	'NFT Volume': 65
}

echarts.use([MarkAreaComponent, CustomChart])

type AxisExtent = {
	min?: number
}

function getZeroBaselineYAxisMin(extent: AxisExtent) {
	return typeof extent.min === 'number' && extent.min < 0 ? extent.min : 0
}

const EVENT_DOT_SIZE = 16
const EVENT_DOT_FILL_POINTS = [
	[8, 0],
	[12, 4],
	[16, 4],
	[16, 16],
	[0, 16],
	[0, 4],
	[4, 4]
] as const
const EVENT_DOT_BORDER_POINTS = [
	[8, 0.5],
	[11.5, 4],
	[15.5, 4],
	[15.5, 15.5],
	[0.5, 15.5],
	[0.5, 4],
	[4.5, 4]
] as const
// 5-point star (path bounds 0..100), centered.
const EVENT_STAR_PATH = 'M50 12 L62 42 L94 42 L68 61 L78 92 L50 73 L22 92 L32 61 L6 42 L38 42 Z'
const EVENT_BODY_CENTER_Y = 10
const EVENT_STAR_ICON_SIZE = 9.5
const EVENT_STAR_Y_OFFSET = EVENT_BODY_CENTER_Y - EVENT_STAR_ICON_SIZE / 2 - 0.5
const EVENT_STRIP_VERTICAL_PADDING = 2
const EVENT_STRIP_HEIGHT = EVENT_DOT_SIZE + EVENT_STRIP_VERTICAL_PADDING * 2
const EVENT_STRIP_TOP_GAP = 2 // between x-axis labels and strip
const EVENT_STRIP_BOTTOM_WITH_ZOOM = 60
const EVENT_STRIP_BOTTOM_NO_ZOOM = 6
const EVENT_HOVER_SCALE = 1.14
const EVENT_HOVER_ANIMATION_MS = 100
const PRIMARY_SERIES_ID_PREFIX = 'protocol-chart-series-'
const EVENT_RAIL_SERIES_ID = 'protocol-chart-events'
const MAIN_GRID_BOTTOM_WITH_ZOOM_NO_EVENTS = 68
const MAIN_GRID_BOTTOM_WITH_ZOOM_EVENTS = EVENT_STRIP_BOTTOM_WITH_ZOOM + EVENT_STRIP_HEIGHT + EVENT_STRIP_TOP_GAP
const MAIN_GRID_BOTTOM_NO_ZOOM_NO_EVENTS = 12
const MAIN_GRID_BOTTOM_NO_ZOOM_EVENTS = EVENT_STRIP_BOTTOM_NO_ZOOM + EVENT_STRIP_HEIGHT + EVENT_STRIP_TOP_GAP

type EventRailDatum = {
	value: [number, number]
	fullText: string
	eventDate: number
	iconPath: string
	iconSize: number
	iconOffsetY: number
	rangeStart?: number
	rangeEnd?: number
	iconColor: string
	itemStyle: {
		color: string
		borderColor: string
		borderWidth: number
	}
}

const DANGER_KEYWORDS = ['depeg', 'hack', 'exploit', 'attack']

function isDangerLabel(label: string) {
	const normalized = label.toLowerCase()
	return DANGER_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function getEventDotPalette(label: string, isThemeDark: boolean, isRange = false) {
	if (isDangerLabel(label)) {
		return isThemeDark
			? {
					fill: 'rgba(220, 38, 38, 0.95)',
					border: 'rgba(252, 165, 165, 1)',
					icon: 'rgba(255, 255, 255, 0.98)'
				}
			: {
					fill: 'rgba(220, 38, 38, 1)',
					border: 'rgba(185, 28, 28, 1)',
					icon: 'rgba(255, 255, 255, 0.98)'
				}
	}

	if (isRange) {
		return isThemeDark
			? {
					fill: 'rgba(196, 181, 253, 0.95)',
					border: 'rgba(221, 214, 254, 1)',
					icon: 'rgba(76, 29, 149, 1)'
				}
			: {
					fill: 'rgba(147, 51, 234, 1)',
					border: 'rgba(126, 34, 206, 1)',
					icon: 'rgba(59, 7, 100, 1)'
				}
	}

	return isThemeDark
		? {
				fill: 'rgba(148, 163, 184, 0.9)',
				border: 'rgba(203, 213, 225, 1)',
				icon: 'rgba(30, 41, 59, 1)'
			}
		: {
				fill: 'rgba(148, 163, 184, 1)',
				border: 'rgba(100, 116, 139, 1)',
				icon: 'rgba(30, 41, 59, 1)'
			}
}

function buildEventRailData({
	hallmarks,
	rangeHallmarks,
	isThemeDark
}: {
	hallmarks: Array<[number, string]> | null
	rangeHallmarks: Array<[[number, number], string]> | null
	isThemeDark: boolean
}) {
	const sortedEvents = [
		...(hallmarks ?? []).map(([timestamp, label]) => ({
			timestamp,
			fullText: label,
			isRange: false as const
		})),
		...(rangeHallmarks ?? []).map(([[start, end], label]) => ({
			timestamp: Math.round((start + end) / 2),
			fullText: label,
			isRange: true as const,
			rangeStart: start,
			rangeEnd: end
		}))
	].sort((a, b) => a.timestamp - b.timestamp)

	const events: EventRailDatum[] = sortedEvents.map((event) => {
		const palette = getEventDotPalette(event.fullText, isThemeDark, event.isRange)

		return {
			value: [event.timestamp, 0],
			fullText: event.fullText,
			eventDate: event.timestamp,
			iconPath: EVENT_STAR_PATH,
			iconSize: EVENT_STAR_ICON_SIZE,
			iconOffsetY: EVENT_STAR_Y_OFFSET,
			iconColor: palette.icon,
			...(event.isRange ? { rangeStart: event.rangeStart, rangeEnd: event.rangeEnd } : {}),
			itemStyle: {
				color: palette.fill,
				borderColor: palette.border,
				borderWidth: 1
			}
		}
	})

	return { events }
}

function getEventStripCenterY(chartHeight: number, shouldHideDataZoom: boolean) {
	const stripBottom = shouldHideDataZoom ? EVENT_STRIP_BOTTOM_NO_ZOOM : EVENT_STRIP_BOTTOM_WITH_ZOOM
	return chartHeight - stripBottom - EVENT_STRIP_HEIGHT / 2
}

export default function ProtocolChart({
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
	const tooltipGroupBy: ChartTimeGrouping = groupBy && groupBy !== 'cumulative' ? groupBy : 'daily'

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const defaultChartSettings = useDefaults({
		color,
		valueSymbol,
		tooltipSort: false,
		hideLegend: true,
		unlockTokenSymbol: unlockTokenSymbol ?? '',
		isThemeDark,
		groupBy: tooltipGroupBy
	})

	const eventRailData = useMemo(
		() => buildEventRailData({ hallmarks, rangeHallmarks, isThemeDark }).events,
		[hallmarks, rangeHallmarks, isThemeDark]
	)

	const { series, allYAxis } = useMemo(() => {
		const uniqueYAxis = new Set()
		const stacks: ProtocolChartsLabels[] = []
		for (const stack in chartData) {
			stacks.push(stack as ProtocolChartsLabels)
		}

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
				id: `${PRIMARY_SERIES_ID_PREFIX}${index}`,
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
			// Start with no markLine data; a single markLine is injected on
			// hover over the matching event icon (see useEffect below).
			series[0] = {
				...series[0],
				markLine: {
					silent: true,
					animation: false,
					symbol: ['none', 'none'],
					label: { show: false },
					emphasis: { label: { show: false } },
					lineStyle: {
						color: isThemeDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(71, 85, 105, 0.55)',
						type: 'dashed',
						width: 1
					},
					data: []
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
		const instance = echarts.getInstanceByDom(el) || echarts.init(el, null, { renderer: 'canvas' })
		chartRef.current = instance
		if (onReady) {
			onReady(instance)
		}

		const mergedSettings = { ...defaultChartSettings } as Record<string, unknown>
		if (chartOptions) {
			for (const option in chartOptions) {
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
				min: getZeroBaselineYAxisMin,
				alignTicks: true,
				offset: noOffset || index == null || index < 2 ? 0 : prevOffset + (customOffsets[type] ?? 40)
			}

			if (type === 'TVL') {
				finalYAxis.push({
					...yAxis,
					min: getZeroBaselineYAxisMin
				})
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
					axisLabel: {
						formatter: (value: number) => formattedNum(value)
					},
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
			finalYAxis.push({
				...yAxis,
				min: getZeroBaselineYAxisMin
			})
		}

		const shouldHideDataZoom = hideDataZoom || series.every((s) => s.data.length < 2)
		const shouldShowEventRail = eventRailData.length > 0

		let timeRangeMin = Infinity
		let timeRangeMax = -Infinity
		if (shouldShowEventRail) {
			for (const s of series) {
				const data = (s.data ?? []) as Array<[number, number] | unknown>
				for (const point of data) {
					const ts = Array.isArray(point) ? (point[0] as number | undefined) : undefined
					if (typeof ts === 'number' && Number.isFinite(ts)) {
						if (ts < timeRangeMin) timeRangeMin = ts
						if (ts > timeRangeMax) timeRangeMax = ts
					}
				}
			}
		}
		const hasTimeRange = Number.isFinite(timeRangeMin) && Number.isFinite(timeRangeMax) && timeRangeMin < timeRangeMax

		const mainGridBottom = shouldShowEventRail
			? shouldHideDataZoom
				? MAIN_GRID_BOTTOM_NO_ZOOM_EVENTS
				: MAIN_GRID_BOTTOM_WITH_ZOOM_EVENTS
			: shouldHideDataZoom
				? MAIN_GRID_BOTTOM_NO_ZOOM_NO_EVENTS
				: MAIN_GRID_BOTTOM_WITH_ZOOM_NO_EVENTS

		const mainGrid = {
			left: 12,
			bottom: mainGridBottom,
			top: (rangeHallmarks?.length ?? 0) > 0 ? 18 : 12,
			right: 12,
			outerBoundsMode: 'same',
			outerBoundsContain: 'axisLabel'
		}
		const finalGrid = mainGrid
		const finalXAxis = shouldShowEventRail && hasTimeRange ? { ...xAxis, min: timeRangeMin, max: timeRangeMax } : xAxis

		const eventStripYAxis = {
			type: 'value',
			min: -1,
			max: 1,
			show: false,
			scale: true
		}
		const eventStripYAxisIndex = finalYAxis.length
		const finalYAxisWithEvents = shouldShowEventRail ? [...finalYAxis, eventStripYAxis] : finalYAxis
		const finalDataZoom = dataZoom
		let hoveredEventDate: number | null = null
		let activeMarkLineEventDate: number | null = null
		let clearMarkLineTimer: ReturnType<typeof setTimeout> | null = null

		const renderEventRailItem = (
			params: { dataIndex: number },
			api: { coord: (value: [number, number]) => number[]; getHeight: () => number }
		) => {
			const event = eventRailData[params.dataIndex]
			if (!event) return

			const [x] = api.coord([event.eventDate, 0])
			if (!Number.isFinite(x)) return

			const centerY = getEventStripCenterY(api.getHeight(), shouldHideDataZoom)
			const isHovered = hoveredEventDate === event.eventDate
			const iconX = (EVENT_DOT_SIZE - event.iconSize) / 2

			return {
				type: 'group',
				x: x - EVENT_DOT_SIZE / 2,
				y: centerY - EVENT_DOT_SIZE / 2,
				originX: EVENT_DOT_SIZE / 2,
				originY: EVENT_DOT_SIZE / 2,
				scaleX: isHovered ? EVENT_HOVER_SCALE : 1,
				scaleY: isHovered ? EVENT_HOVER_SCALE : 1,
				transition: ['scaleX', 'scaleY'],
				updateAnimation: {
					duration: EVENT_HOVER_ANIMATION_MS,
					easing: 'cubicOut'
				},
				cursor: 'pointer',
				focus: 'none',
				emphasisDisabled: true,
				children: [
					{
						type: 'polygon',
						shape: {
							points: EVENT_DOT_FILL_POINTS.map(([px, py]) => [px, py])
						},
						style: {
							fill: event.itemStyle.color
						},
						blur: {
							style: {
								opacity: 1
							}
						}
					},
					{
						type: 'polygon',
						shape: {
							points: EVENT_DOT_BORDER_POINTS.map(([px, py]) => [px, py])
						},
						style: {
							fill: 'none',
							stroke: event.itemStyle.borderColor,
							lineWidth: event.itemStyle.borderWidth,
							lineJoin: 'miter',
							miterLimit: 2
						},
						blur: {
							style: {
								opacity: 1
							}
						}
					},
					{
						type: 'path',
						shape: {
							pathData: event.iconPath,
							x: iconX,
							y: event.iconOffsetY,
							width: event.iconSize,
							height: event.iconSize,
							layout: 'cover'
						},
						style: {
							fill: event.iconColor
						},
						blur: {
							style: {
								opacity: 1
							}
						}
					}
				]
			}
		}

		const finalSeries = shouldShowEventRail
			? [
					...series,
					{
						id: EVENT_RAIL_SERIES_ID,
						name: 'Events',
						type: 'custom',
						renderItem: renderEventRailItem,
						clip: false,
						xAxisIndex: 0,
						yAxisIndex: eventStripYAxisIndex,
						data: eventRailData,
						z: 20,
						silent: false,
						animation: false,
						encode: { x: 0, y: 1 },
						tooltip: {
							trigger: 'item',
							formatter: (params: { data?: EventRailDatum }) => {
								const event = params.data
								if (!event) return ''

								const header = formatTooltipChartDate(event.eventDate, tooltipGroupBy)
								const rangeLine =
									event.rangeStart != null && event.rangeEnd != null
										? `<li style="list-style:none;opacity:0.7;">${new Date(event.rangeStart).toLocaleDateString()} - ${new Date(event.rangeEnd).toLocaleDateString()}</li>`
										: ''

								return `${header}<li style="list-style:none;font-weight:600;">${event.fullText}</li>${rangeLine}`
							}
						},
						emphasis: {
							disabled: true
						}
					}
				]
			: series

		instance.setOption({
			graphic,
			tooltip,
			grid: finalGrid,
			xAxis: finalXAxis,
			yAxis: finalYAxisWithEvents,
			...(shouldHideDataZoom ? {} : { dataZoom: finalDataZoom }),
			series: finalSeries
		})
		let disposed = false
		const refreshEventRail = () => {
			instance.setOption({
				series: [{ id: EVENT_RAIL_SERIES_ID, data: eventRailData }]
			})
		}

		const clearEventMarkLineOnly = () => {
			if (disposed || activeMarkLineEventDate == null) return
			activeMarkLineEventDate = null
			instance.setOption({
				series: [{ id: `${PRIMARY_SERIES_ID_PREFIX}0`, markLine: { data: [] } }]
			})
		}

		const clearEventHover = () => {
			if (disposed) return
			const shouldRefreshEventRail = hoveredEventDate != null
			hoveredEventDate = null
			clearEventMarkLineOnly()
			if (shouldRefreshEventRail) refreshEventRail()
		}

		const scheduleClearEventMarkLine = () => {
			if (clearMarkLineTimer != null) clearTimeout(clearMarkLineTimer)
			clearMarkLineTimer = setTimeout(() => {
				clearMarkLineTimer = null
				clearEventHover()
			}, 40)
		}

		// Show the dashed markLine only while the user is hovering an event icon.
		const hasPointEvents = shouldShowEventRail && eventRailData.some((e) => e.rangeStart == null)
		const handleEventMouseOver = (params: { seriesName?: string; data?: unknown }) => {
			if (disposed) return
			if (params.seriesName !== 'Events') return
			if (clearMarkLineTimer != null) {
				clearTimeout(clearMarkLineTimer)
				clearMarkLineTimer = null
			}
			const event = params.data as EventRailDatum | undefined
			if (!event || event.rangeStart != null) {
				if (event?.eventDate != null && hoveredEventDate !== event.eventDate) {
					hoveredEventDate = event.eventDate
					refreshEventRail()
				}
				clearEventMarkLineOnly()
				if (!event) scheduleClearEventMarkLine()
				return
			}
			if (hoveredEventDate !== event.eventDate) {
				hoveredEventDate = event.eventDate
				refreshEventRail()
			}
			if (activeMarkLineEventDate === event.eventDate) return
			activeMarkLineEventDate = event.eventDate
			instance.setOption({
				series: [
					{
						id: `${PRIMARY_SERIES_ID_PREFIX}0`,
						markLine: {
							data: [
								[
									{ name: event.fullText, xAxis: event.eventDate, yAxis: 0 },
									{ xAxis: event.eventDate, yAxis: 'max' }
								]
							]
						}
					}
				]
			})
		}
		const handleEventMouseOut = (params: { seriesName?: string }) => {
			if (disposed) return
			if (params.seriesName !== 'Events') return
			scheduleClearEventMarkLine()
		}
		if (hasPointEvents) {
			instance.on('mouseover', handleEventMouseOver)
			instance.on('mouseout', handleEventMouseOut)
		}

		return () => {
			disposed = true
			if (clearMarkLineTimer != null) {
				clearTimeout(clearMarkLineTimer)
				clearMarkLineTimer = null
			}
			if (hasPointEvents) {
				instance.off('mouseover', handleEventMouseOver)
				instance.off('mouseout', handleEventMouseOut)
			}
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
		eventRailData,
		isThemeDark,
		tooltipGroupBy,
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
