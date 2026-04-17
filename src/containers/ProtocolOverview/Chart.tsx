import { CustomChart } from 'echarts/charts'
import { MarkAreaComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { useEffect, useId, useMemo, useRef } from 'react'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import type { ChartTimeGrouping } from '~/components/ECharts/types'
import { useDefaults } from '~/components/ECharts/useDefaults'
import { mergeDeep } from '~/components/ECharts/utils'
import { useChartResize } from '~/hooks/useChartResize'
import {
	buildEventRailData,
	EVENT_DOT_BORDER_POLYGON_POINTS,
	EVENT_DOT_FILL_POLYGON_POINTS,
	EVENT_RAIL_LAYOUT,
	type EventRailDatum,
	getEventStripCenterY,
	getMainGridBottom
} from './chartEventRail'
import { buildProtocolYAxis } from './chartYAxis'
import { BAR_CHARTS, type ProtocolChartsLabels, yAxisByChart } from './constants'
import type { IProtocolCoreChartProps } from './types'

echarts.use([MarkAreaComponent, CustomChart])

const PRIMARY_SERIES_ID_PREFIX = 'protocol-chart-series-'

type EventHoverState = {
	hoveredEventDate: number | null
}

function attachEventHoverHandlers({
	instance,
	eventRailData,
	hoverState
}: {
	instance: echarts.ECharts
	eventRailData: EventRailDatum[]
	hoverState: EventHoverState
}) {
	let disposed = false
	let activeMarkLineEventDate: number | null = null
	let clearMarkLineTimer: ReturnType<typeof setTimeout> | null = null

	const refreshEventRail = () => {
		instance.setOption({
			series: [{ id: EVENT_RAIL_LAYOUT.seriesId, data: eventRailData }]
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
		const shouldRefreshEventRail = hoverState.hoveredEventDate != null
		hoverState.hoveredEventDate = null
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

	const hasPointEvents = eventRailData.some((event) => event.rangeStart == null)
	const handleEventMouseOver = (params: { seriesName?: string; data?: unknown }) => {
		if (disposed || params.seriesName !== 'Events') return
		if (clearMarkLineTimer != null) {
			clearTimeout(clearMarkLineTimer)
			clearMarkLineTimer = null
		}

		const event = params.data as EventRailDatum | undefined
		if (!event || event.rangeStart != null) {
			if (event?.eventDate != null && hoverState.hoveredEventDate !== event.eventDate) {
				hoverState.hoveredEventDate = event.eventDate
				refreshEventRail()
			}
			clearEventMarkLineOnly()
			if (!event) scheduleClearEventMarkLine()
			return
		}

		if (hoverState.hoveredEventDate !== event.eventDate) {
			hoverState.hoveredEventDate = event.eventDate
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
		if (disposed || params.seriesName !== 'Events') return
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
	}
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
			const type = BAR_CHARTS.includes(stack) && !isCumulative ? 'bar' : 'line'

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

		const chartsInSeries = new Set(series.map((s) => s.name))
		const finalYAxis = buildProtocolYAxis({
			allYAxis,
			baseYAxis: yAxis,
			chartColors,
			chartsInSeries,
			unlockTokenSymbol
		})

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

		const mainGridBottom = getMainGridBottom({ shouldShowEventRail, shouldHideDataZoom })

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
		const hoverState: EventHoverState = { hoveredEventDate: null }

		const renderEventRailItem = (
			params: { dataIndex: number },
			api: { coord: (value: [number, number]) => number[]; getHeight: () => number }
		) => {
			const event = eventRailData[params.dataIndex]
			if (!event) return

			const [x] = api.coord([event.eventDate, 0])
			if (!Number.isFinite(x)) return

			const centerY = getEventStripCenterY(api.getHeight(), shouldHideDataZoom)
			const isHovered = hoverState.hoveredEventDate === event.eventDate
			const iconX = (EVENT_RAIL_LAYOUT.dotSize - event.iconSize) / 2

			return {
				type: 'group',
				x: x - EVENT_RAIL_LAYOUT.dotSize / 2,
				y: centerY - EVENT_RAIL_LAYOUT.dotSize / 2,
				originX: EVENT_RAIL_LAYOUT.dotSize / 2,
				originY: EVENT_RAIL_LAYOUT.dotSize / 2,
				scaleX: isHovered ? EVENT_RAIL_LAYOUT.hoverScale : 1,
				scaleY: isHovered ? EVENT_RAIL_LAYOUT.hoverScale : 1,
				transition: ['scaleX', 'scaleY'],
				updateAnimation: {
					duration: EVENT_RAIL_LAYOUT.hoverAnimationMs,
					easing: 'cubicOut'
				},
				cursor: 'pointer',
				focus: 'none',
				emphasisDisabled: true,
				children: [
					{
						type: 'polygon',
						shape: {
							points: EVENT_DOT_FILL_POLYGON_POINTS
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
							points: EVENT_DOT_BORDER_POLYGON_POINTS
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
						id: EVENT_RAIL_LAYOUT.seriesId,
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
		const detachEventHoverHandlers = attachEventHoverHandlers({
			instance,
			eventRailData: shouldShowEventRail ? eventRailData : [],
			hoverState
		})

		return () => {
			detachEventHoverHandlers()
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
