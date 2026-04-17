import type * as echarts from 'echarts/core'
import { formatTooltipChartDate } from './formatters'
import type { ChartTimeGrouping } from './types'

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

const EVENT_BODY_CENTER_Y = 10
const EVENT_STAR_ICON_SIZE = 9.5
const EVENT_STAR_Y_OFFSET = EVENT_BODY_CENTER_Y - EVENT_STAR_ICON_SIZE / 2 - 0.5
const EVENT_STRIP_VERTICAL_PADDING = 2
const EVENT_STRIP_HEIGHT = EVENT_DOT_SIZE + EVENT_STRIP_VERTICAL_PADDING * 2
const EVENT_STRIP_TOP_GAP = 2
const EVENT_STRIP_BOTTOM_WITH_ZOOM = 60
const EVENT_STRIP_BOTTOM_NO_ZOOM = 6
const EVENT_HOVER_SCALE = 1.14
const EVENT_HOVER_ANIMATION_MS = 100
const EVENT_RAIL_SERIES_ID = 'echarts-hallmark-events'
const EVENT_MARKLINE_GRAPHIC_ID = 'echarts-hallmark-markline'

const EVENT_STAR_PATH = 'M50 12 L62 42 L94 42 L68 61 L78 92 L50 73 L22 92 L32 61 L6 42 L38 42 Z'
const DANGER_KEYWORDS = ['depeg', 'hack', 'exploit', 'attack']

export const EVENT_DOT_FILL_POLYGON_POINTS = EVENT_DOT_FILL_POINTS.map(([x, y]) => [x, y] as [number, number])
export const EVENT_DOT_BORDER_POLYGON_POINTS = EVENT_DOT_BORDER_POINTS.map(([x, y]) => [x, y] as [number, number])

export type EventRailDatum = {
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

export type EventHoverState = {
	hoveredEventDate: number | null
}

export const EVENT_RAIL_LAYOUT = {
	dotSize: EVENT_DOT_SIZE,
	stripHeight: EVENT_STRIP_HEIGHT,
	stripTopGap: EVENT_STRIP_TOP_GAP,
	stripBottomWithZoom: EVENT_STRIP_BOTTOM_WITH_ZOOM,
	stripBottomNoZoom: EVENT_STRIP_BOTTOM_NO_ZOOM,
	hoverScale: EVENT_HOVER_SCALE,
	hoverAnimationMs: EVENT_HOVER_ANIMATION_MS,
	seriesId: EVENT_RAIL_SERIES_ID,
	markLineGraphicId: EVENT_MARKLINE_GRAPHIC_ID
} as const

const RANGE_TOOLTIP_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	timeZone: 'UTC'
})

function isDangerLabel(label: string) {
	const normalized = label.toLowerCase()
	return DANGER_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function normalizeTimestamp(value: number, dateInMs: boolean) {
	return dateInMs ? +value : +value * 1e3
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

function formatRangeTooltipDate(value: number) {
	return RANGE_TOOLTIP_DATE_FORMATTER.format(new Date(value))
}

export function buildEventRailData({
	hallmarks,
	rangeHallmarks,
	isThemeDark,
	dateInMs = true
}: {
	hallmarks?: Array<[number, string]> | null
	rangeHallmarks?: Array<[[number, number], string]> | null
	isThemeDark: boolean
	dateInMs?: boolean
}) {
	const sortedEvents = [
		...(hallmarks ?? []).map(([timestamp, label]) => ({
			timestamp: normalizeTimestamp(timestamp, dateInMs),
			fullText: label,
			isRange: false as const
		})),
		...(rangeHallmarks ?? []).map(([[start, end], label]) => {
			const normalizedStart = normalizeTimestamp(start, dateInMs)
			const normalizedEnd = normalizeTimestamp(end, dateInMs)

			return {
				timestamp: Math.round((normalizedStart + normalizedEnd) / 2),
				fullText: label,
				isRange: true as const,
				rangeStart: normalizedStart,
				rangeEnd: normalizedEnd
			}
		})
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

export function getEventStripCenterY(chartHeight: number, shouldHideDataZoom: boolean) {
	const stripBottom = shouldHideDataZoom ? EVENT_STRIP_BOTTOM_NO_ZOOM : EVENT_STRIP_BOTTOM_WITH_ZOOM
	return chartHeight - stripBottom - EVENT_STRIP_HEIGHT / 2
}

export function getMainGridBottom({
	shouldShowEventRail,
	shouldHideDataZoom
}: {
	shouldShowEventRail: boolean
	shouldHideDataZoom: boolean
}) {
	if (!shouldShowEventRail) {
		return shouldHideDataZoom ? 12 : 68
	}

	return shouldHideDataZoom
		? EVENT_STRIP_BOTTOM_NO_ZOOM + EVENT_STRIP_HEIGHT + EVENT_STRIP_TOP_GAP
		: EVENT_STRIP_BOTTOM_WITH_ZOOM + EVENT_STRIP_HEIGHT + EVENT_STRIP_TOP_GAP
}

export function createEventStripYAxis() {
	return {
		type: 'value',
		min: -1,
		max: 1,
		show: false,
		scale: true
	}
}

export function getSortedSeriesTimeBounds(data: Array<[number, number] | unknown>) {
	let min: number | undefined
	let max: number | undefined

	for (let index = 0; index < data.length; index++) {
		const point = data[index]
		if (!Array.isArray(point)) continue
		const timestamp = point[0]
		if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
			min = timestamp
			break
		}
	}

	for (let index = data.length - 1; index >= 0; index--) {
		const point = data[index]
		if (!Array.isArray(point)) continue
		const timestamp = point[0]
		if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
			max = timestamp
			break
		}
	}

	return { min, max }
}

export function getSortedDatasetTimeBounds(
	source: Array<Record<string, string | number | null | undefined>>,
	timestampKey = 'timestamp'
) {
	let min: number | undefined
	let max: number | undefined

	for (let index = 0; index < source.length; index++) {
		const timestamp = Number(source[index]?.[timestampKey])
		if (Number.isFinite(timestamp)) {
			min = timestamp
			break
		}
	}

	for (let index = source.length - 1; index >= 0; index--) {
		const timestamp = Number(source[index]?.[timestampKey])
		if (Number.isFinite(timestamp)) {
			max = timestamp
			break
		}
	}

	return { min, max }
}

function toGraphicArray(graphic: unknown) {
	if (Array.isArray(graphic)) return graphic
	return graphic ? [graphic] : []
}

export function mergeGraphicWithEventMarkLinePlaceholder(graphic: unknown, isThemeDark: boolean) {
	return [
		...toGraphicArray(graphic),
		{
			id: EVENT_MARKLINE_GRAPHIC_ID,
			type: 'line',
			silent: true,
			z: 15,
			invisible: true,
			shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
			style: {
				stroke: isThemeDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(71, 85, 105, 0.55)',
				lineWidth: 1,
				lineDash: [6, 4]
			}
		}
	]
}

export function createEventRailSeries({
	eventRailData,
	eventStripYAxisIndex,
	hoverState,
	shouldHideDataZoom,
	tooltipGroupBy
}: {
	eventRailData: EventRailDatum[]
	eventStripYAxisIndex: number
	hoverState: EventHoverState
	shouldHideDataZoom: boolean
	tooltipGroupBy: ChartTimeGrouping
}) {
	return {
		id: EVENT_RAIL_SERIES_ID,
		name: 'Events',
		type: 'custom',
		renderItem: (
			params: { dataIndex: number },
			api: { coord: (value: [number, number]) => number[]; getHeight: () => number }
		) => {
			const event = eventRailData[params.dataIndex]
			if (!event) return

			const [x] = api.coord([event.eventDate, 0])
			if (!Number.isFinite(x)) return

			const centerY = getEventStripCenterY(api.getHeight(), shouldHideDataZoom)
			const isHovered = hoverState.hoveredEventDate === event.eventDate
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
						shape: { points: EVENT_DOT_FILL_POLYGON_POINTS },
						style: { fill: event.itemStyle.color },
						blur: { style: { opacity: 1 } }
					},
					{
						type: 'polygon',
						shape: { points: EVENT_DOT_BORDER_POLYGON_POINTS },
						style: {
							fill: 'none',
							stroke: event.itemStyle.borderColor,
							lineWidth: event.itemStyle.borderWidth,
							lineJoin: 'miter',
							miterLimit: 2
						},
						blur: { style: { opacity: 1 } }
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
						style: { fill: event.iconColor },
						blur: { style: { opacity: 1 } }
					}
				]
			}
		},
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
						? `<li style="list-style:none;opacity:0.7;">${formatRangeTooltipDate(event.rangeStart)} - ${formatRangeTooltipDate(event.rangeEnd)}</li>`
						: ''

				return `${header}<li style="list-style:none;font-weight:600;">${event.fullText}</li>${rangeLine}`
			}
		},
		emphasis: {
			disabled: true
		}
	}
}

export function attachEventHoverHandlers({
	instance,
	eventRailData,
	hoverState,
	getEventMarkLineShape
}: {
	instance: echarts.ECharts
	eventRailData: EventRailDatum[]
	hoverState: EventHoverState
	getEventMarkLineShape: (eventDate: number) => { x1: number; y1: number; x2: number; y2: number } | null
}) {
	let disposed = false
	let activeMarkLineEventDate: number | null = null
	let clearMarkLineTimer: ReturnType<typeof setTimeout> | null = null
	let activeMarkLineShapeKey: string | null = null

	const setEventMarkLineGraphic = (eventDate: number) => {
		const shape = getEventMarkLineShape(eventDate)
		if (!shape) return
		const nextShapeKey = `${shape.x1}:${shape.y1}:${shape.x2}:${shape.y2}`
		if (activeMarkLineShapeKey === nextShapeKey) return
		activeMarkLineShapeKey = nextShapeKey

		instance.setOption({
			graphic: [
				{
					id: EVENT_MARKLINE_GRAPHIC_ID,
					shape,
					invisible: false
				}
			]
		})
	}

	const syncActiveEventMarkLine = () => {
		if (disposed || activeMarkLineEventDate == null) return
		setEventMarkLineGraphic(activeMarkLineEventDate)
	}

	const refreshEventRail = () => {
		instance.setOption({
			series: [{ id: EVENT_RAIL_SERIES_ID, data: eventRailData }]
		})
	}

	const clearEventMarkLineOnly = () => {
		if (disposed || activeMarkLineEventDate == null) return
		activeMarkLineEventDate = null
		activeMarkLineShapeKey = null
		instance.setOption({
			graphic: [{ id: EVENT_MARKLINE_GRAPHIC_ID, invisible: true }]
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

	const hasEvents = eventRailData.length > 0
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
		setEventMarkLineGraphic(event.eventDate)
	}

	const handleEventMouseOut = (params: { seriesName?: string }) => {
		if (disposed || params.seriesName !== 'Events') return
		scheduleClearEventMarkLine()
	}

	if (hasEvents) {
		instance.on('mouseover', handleEventMouseOver)
		instance.on('mouseout', handleEventMouseOut)
	}
	if (hasPointEvents) {
		instance.on('datazoom', syncActiveEventMarkLine)
		instance.on('finished', syncActiveEventMarkLine)
	}

	return () => {
		if (clearMarkLineTimer != null) {
			clearTimeout(clearMarkLineTimer)
			clearMarkLineTimer = null
		}
		if (activeMarkLineEventDate != null) {
			instance.setOption({
				graphic: [{ id: EVENT_MARKLINE_GRAPHIC_ID, invisible: true }]
			})
			activeMarkLineEventDate = null
			activeMarkLineShapeKey = null
		}
		if (hasEvents) {
			instance.off('mouseover', handleEventMouseOver)
			instance.off('mouseout', handleEventMouseOut)
		}
		if (hasPointEvents) {
			instance.off('datazoom', syncActiveEventMarkLine)
			instance.off('finished', syncActiveEventMarkLine)
		}
		disposed = true
	}
}
