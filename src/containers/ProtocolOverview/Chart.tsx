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
// Square body with a pointed "arrow" on top (path bounds 0..100 on both axes).
const EVENT_DOT_PATH = 'M50 0 L72 22 L100 22 L100 100 L0 100 L0 22 L28 22 Z'
// 5-point star (path bounds 0..100), centered.
const EVENT_STAR_PATH = 'M50 12 L62 42 L94 42 L68 61 L78 92 L50 73 L22 92 L32 61 L6 42 L38 42 Z'
// Anatomical skull: wide rounded cranium with cheekbones narrowing into a
// smaller jaw that carries three teeth notches. Eye sockets and nose are
// traced in the opposite winding direction so (under non-zero fill rule)
// they punch transparent cut-outs that show the badge color through them.
const EVENT_SKULL_PATH =
	// skull silhouette (CW)
	'M50 6C74 6 86 24 86 40' +
	'L86 50C86 56 82 60 76 60' +
	'C74 60 72 62 72 66' +
	'L72 74C72 78 68 82 62 82' +
	'L60 82L60 90L56 90L56 82' +
	'L52 82L52 90L48 90L48 82' +
	'L44 82L44 90L40 90L40 82' +
	'L38 82C32 82 28 78 28 74' +
	'L28 66C28 62 26 60 24 60' +
	'C18 60 14 56 14 50' +
	'L14 40C14 24 26 6 50 6Z' +
	// left eye socket (CCW → hole)
	'M34 37C30.14 37 27 40.14 27 44C27 47.86 30.14 51 34 51C37.86 51 41 47.86 41 44C41 40.14 37.86 37 34 37Z' +
	// right eye socket (CCW → hole)
	'M66 37C62.14 37 59 40.14 59 44C59 47.86 62.14 51 66 51C69.86 51 73 47.86 73 44C73 40.14 69.86 37 66 37Z' +
	// nose hole (CCW → hole)
	'M50 56L47 65L53 65Z'
const EVENT_ICON_SIZE = 12
// Vertical offset (in EVENT_DOT_SIZE units) to center the star inside the
// square body — not the tip — of the badge. The badge body starts at y=22 of
// the path (out of 100), so its visual center is around 61% down.
const EVENT_STAR_Y_FRACTION = 0.61
const EVENT_ICON_Y_OFFSET = EVENT_DOT_SIZE * EVENT_STAR_Y_FRACTION - EVENT_ICON_SIZE / 2
const EVENT_STRIP_VERTICAL_PADDING = 2
const EVENT_STRIP_HEIGHT = EVENT_DOT_SIZE + EVENT_STRIP_VERTICAL_PADDING * 2
const EVENT_STRIP_TOP_GAP = 2 // between x-axis labels and strip
const EVENT_STRIP_BOTTOM_WITH_ZOOM = 60
const EVENT_STRIP_BOTTOM_NO_ZOOM = 6
const MAIN_GRID_BOTTOM_WITH_ZOOM_NO_EVENTS = 68
const MAIN_GRID_BOTTOM_WITH_ZOOM_EVENTS = EVENT_STRIP_BOTTOM_WITH_ZOOM + EVENT_STRIP_HEIGHT + EVENT_STRIP_TOP_GAP
const MAIN_GRID_BOTTOM_NO_ZOOM_NO_EVENTS = 12
const MAIN_GRID_BOTTOM_NO_ZOOM_EVENTS = EVENT_STRIP_BOTTOM_NO_ZOOM + EVENT_STRIP_HEIGHT + EVENT_STRIP_TOP_GAP

type EventRailDatum = {
	value: [number, number]
	fullText: string
	eventDate: number
	iconPath: string
	rangeStart?: number
	rangeEnd?: number
	iconColor: string
	itemStyle: {
		color: string
		borderColor: string
		borderWidth: number
	}
}

const DANGER_KEYWORDS = ['depeg', 'hack', 'exploit']

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
		const isDanger = isDangerLabel(event.fullText)
		const palette = getEventDotPalette(event.fullText, isThemeDark, event.isRange)

		return {
			value: [event.timestamp, 0],
			fullText: event.fullText,
			eventDate: event.timestamp,
			iconPath: isDanger ? EVENT_SKULL_PATH : EVENT_STAR_PATH,
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

		const renderEventRailItem = (
			params: { dataIndex: number },
			api: { coord: (value: [number, number]) => number[]; getHeight: () => number }
		) => {
			const event = eventRailData[params.dataIndex]
			if (!event) return

			const [x] = api.coord([event.eventDate, 0])
			if (!Number.isFinite(x)) return

			const centerY = getEventStripCenterY(api.getHeight(), shouldHideDataZoom)

			return {
				type: 'group',
				x: x - EVENT_DOT_SIZE / 2,
				y: centerY - EVENT_DOT_SIZE / 2,
				cursor: 'pointer',
				children: [
					{
						type: 'path',
						shape: {
							pathData: EVENT_DOT_PATH,
							x: 0,
							y: 0,
							width: EVENT_DOT_SIZE,
							height: EVENT_DOT_SIZE,
							layout: 'cover'
						},
						style: {
							fill: event.itemStyle.color,
							stroke: event.itemStyle.borderColor,
							lineWidth: event.itemStyle.borderWidth
						}
					},
					{
						type: 'path',
						shape: {
							pathData: event.iconPath,
							x: (EVENT_DOT_SIZE - EVENT_ICON_SIZE) / 2,
							y: EVENT_ICON_Y_OFFSET,
							width: EVENT_ICON_SIZE,
							height: EVENT_ICON_SIZE,
							layout: 'cover'
						},
						style: {
							fill: event.iconColor
						}
					}
				]
			}
		}

		const finalSeries = shouldShowEventRail
			? [
					...series,
					{
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

		// Show the dashed markLine only while the user is hovering an event icon.
		const hasPointEvents = shouldShowEventRail && eventRailData.some((e) => e.rangeStart == null)
		const handleEventMouseOver = (params: { seriesName?: string; data?: unknown }) => {
			if (disposed) return
			if (params.seriesName !== 'Events') return
			const event = params.data as EventRailDatum | undefined
			if (!event || event.rangeStart != null) return
			instance.setOption({
				series: [
					{
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
			instance.setOption({
				series: [{ markLine: { data: [] } }]
			})
		}
		if (hasPointEvents) {
			instance.on('mouseover', handleEventMouseOver)
			instance.on('mouseout', handleEventMouseOut)
		}

		return () => {
			disposed = true
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
