/**
 * Time-range presets used by the chain-overview chart's quick-select buttons.
 * Each preset describes how to drive an ECharts `dataZoom` action.
 *
 * - "All" resets the brush to the full data range (start: 0, end: 100).
 * - Windowed presets express an absolute time window ending "now" using
 *   `startValue` and `endValue` (milliseconds since epoch); ECharts will
 *   clamp values that fall outside the chart's actual data extent, so this
 *   works across charts whose data starts later than the requested window.
 */

export const TIME_RANGE_PRESETS = ['7d', '30d', '90d', '1y', 'All'] as const

export type TimeRangePreset = (typeof TIME_RANGE_PRESETS)[number]

const DAY_MS = 24 * 60 * 60 * 1000

export type DataZoomTarget =
	| { kind: 'percent'; start: number; end: number }
	| { kind: 'absolute'; startValue: number; endValue: number }

export function computeTimeRangePreset(preset: TimeRangePreset, now: number = Date.now()): DataZoomTarget {
	if (preset === 'All') {
		return { kind: 'percent', start: 0, end: 100 }
	}
	const days = preset === '7d' ? 7 : preset === '30d' ? 30 : preset === '90d' ? 90 : 365
	return { kind: 'absolute', startValue: now - days * DAY_MS, endValue: now }
}
