import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { getBucketTimestampSec } from '~/components/ECharts/utils'
import type { IProtocolOverviewPageData } from './types'

export type IProtocolNumericSeries = Array<[number, number]>

export const getGroupedTimestampSec = (timestampSec: number, groupBy: ChartTimeGroupingWithCumulative): number => {
	return groupBy === 'cumulative' ? timestampSec : getBucketTimestampSec(timestampSec, groupBy)
}

export function normalizeChartPointsToMs(points: unknown): IProtocolNumericSeries | null {
	if (!Array.isArray(points)) return null

	const normalized: IProtocolNumericSeries = []
	for (const point of points) {
		if (!Array.isArray(point) || point.length < 2) continue

		const rawTimestamp = Number(point[0])
		const value = Number(point[1])
		if (!Number.isFinite(rawTimestamp) || !Number.isFinite(value)) continue

		const timestampMs = rawTimestamp >= 1e12 ? Math.floor(rawTimestamp) : Math.floor(rawTimestamp * 1e3)
		normalized.push([timestampMs, value])
	}

	normalized.sort((a, b) => a[0] - b[0])
	return normalized.length > 0 ? normalized : null
}

export function normalizeSeriesToSeconds(series: ReadonlyArray<[number, number]>): IProtocolNumericSeries {
	const normalized: IProtocolNumericSeries = []
	for (const [timestamp, value] of series) {
		normalized.push([timestamp >= 1e12 ? Math.floor(timestamp / 1e3) : Math.floor(timestamp), value])
	}
	normalized.sort((a, b) => a[0] - b[0])
	return normalized
}

export function normalizeSeriesToMilliseconds(series: ReadonlyArray<[number, number]>): IProtocolNumericSeries {
	const normalized: IProtocolNumericSeries = []
	for (const [timestamp, value] of series) {
		normalized.push([timestamp >= 1e12 ? Math.floor(timestamp) : Math.floor(timestamp * 1e3), value])
	}
	normalized.sort((a, b) => a[0] - b[0])
	return normalized
}

export function normalizeBridgeVolumeToChartMs(
	bridgeVolumeData: IProtocolOverviewPageData['bridgeVolume']
): IProtocolNumericSeries | null {
	if (!bridgeVolumeData?.length) return null

	// Match BridgeVolume in index.tsx: sum per-item midpoint volumes for the same date.
	const sumByDate: Record<string, number> = {}
	for (const item of bridgeVolumeData) {
		sumByDate[item.date] = (sumByDate[item.date] ?? 0) + (item.depositUSD + item.withdrawUSD) / 2
	}

	const chart: IProtocolNumericSeries = []
	for (const date in sumByDate) {
		const timestampMs = Number(date) * 1e3
		const value = sumByDate[date]
		if (!Number.isFinite(timestampMs) || !Number.isFinite(value)) continue
		chart.push([timestampMs, value])
	}
	chart.sort((a, b) => a[0] - b[0])

	return chart.length > 0 ? chart : null
}
