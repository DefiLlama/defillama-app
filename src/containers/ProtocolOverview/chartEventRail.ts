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
const EVENT_RAIL_SERIES_ID = 'protocol-chart-events'

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

export const EVENT_RAIL_LAYOUT = {
	dotSize: EVENT_DOT_SIZE,
	stripHeight: EVENT_STRIP_HEIGHT,
	stripTopGap: EVENT_STRIP_TOP_GAP,
	stripBottomWithZoom: EVENT_STRIP_BOTTOM_WITH_ZOOM,
	stripBottomNoZoom: EVENT_STRIP_BOTTOM_NO_ZOOM,
	hoverScale: EVENT_HOVER_SCALE,
	hoverAnimationMs: EVENT_HOVER_ANIMATION_MS,
	seriesId: EVENT_RAIL_SERIES_ID
} as const

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

export function buildEventRailData({
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
