import type { ChartTimeGrouping, MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from './types'
import { ensureChronologicalRows, getBucketTimestampMs } from './utils'

/** Canonical millisecond timestamp used by the time-series builder input/output. */
export type TimestampMs = number
/** Normalized chart point as `[timestampMs, value]`. */
export type TimePoint = readonly [timestampMs: TimestampMs, value: number]

/** Multi-series bar input where each series contributes summed values per selected time bucket. */
export type PeriodBarSeries = {
	name: string
	color: string
	stack: string
	points: readonly TimePoint[]
}

/** Multi-series line input where each series contributes one numeric value per timestamp. */
export type PeriodLineSeries = {
	name: string
	color: string
	points: readonly TimePoint[]
}

/**
 * Canonical multi-series time chart builder input.
 *
 * - `periodBars`: bucket points by `groupBy`, sum values inside each bucket, render bars.
 * - `periodLines`: bucket points by `groupBy`, keep the last value inside each bucket, render lines.
 * - `cumulativeLines`: preserve raw timestamps, sum duplicate timestamps, then apply a running total, render lines.
 */
export type TimeSeriesChartInput =
	| {
			kind: 'periodBars'
			groupBy: ChartTimeGrouping
			series: readonly PeriodBarSeries[]
	  }
	| {
			kind: 'periodLines'
			groupBy: ChartTimeGrouping
			series: readonly PeriodLineSeries[]
	  }
	| {
			kind: 'cumulativeLines'
			series: readonly PeriodLineSeries[]
	  }

/** Exact `MultiSeriesChart2` render shape returned by the builder. */
export type TimeSeriesChartSpec = {
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
}

type InputSeries = PeriodBarSeries | PeriodLineSeries

type BuiltSeries = {
	type: 'bar' | 'line'
	name: string
	color: string
	stack?: string
	points: TimePoint[]
}

type MissingValueMode = 'null' | 'carry'

const EMPTY_CHART_SPEC: TimeSeriesChartSpec = {
	dataset: { source: [], dimensions: ['timestamp'] },
	charts: []
}

/** Exhaustiveness guard for future `TimeSeriesChartInput` variants. */
function assertNever(value: never): never {
	throw new Error(`Unhandled time series chart kind: ${JSON.stringify(value)}`)
}

/** Reject ambiguous output by requiring every rendered series name to be unique. */
function assertUniqueSeriesNames(series: readonly InputSeries[]) {
	const seenNames = new Set<string>()

	for (const item of series) {
		if (seenNames.has(item.name)) {
			throw new Error(`Duplicate series name "${item.name}" is not allowed`)
		}

		seenNames.add(item.name)
	}
}

/** Require ascending timestamps so cumulative output and "last value wins" semantics stay predictable. */
function assertAscendingPoints(series: readonly InputSeries[]) {
	for (const item of series) {
		for (let i = 1; i < item.points.length; i++) {
			if (item.points[i][0] < item.points[i - 1][0]) {
				throw new Error(`Series "${item.name}" points must be sorted ascending by timestamp`)
			}
		}
	}
}

/** Group points into period buckets and sum all values inside each bucket. */
function groupSummedPoints(points: readonly TimePoint[], groupBy: ChartTimeGrouping): TimePoint[] {
	const valuesByTimestamp = new Map<number, number>()

	for (const [timestamp, value] of points) {
		const bucketTimestamp = getBucketTimestampMs(timestamp, groupBy)
		valuesByTimestamp.set(bucketTimestamp, (valuesByTimestamp.get(bucketTimestamp) ?? 0) + value)
	}

	return Array.from(valuesByTimestamp.entries()).map(([timestamp, value]) => [timestamp, value] as const)
}

/** Group points into period buckets and keep only the last value seen in each bucket. */
function groupLastPoints(points: readonly TimePoint[], groupBy: ChartTimeGrouping): TimePoint[] {
	const valuesByTimestamp = new Map<number, number>()

	for (const [timestamp, value] of points) {
		valuesByTimestamp.set(getBucketTimestampMs(timestamp, groupBy), value)
	}

	return Array.from(valuesByTimestamp.entries()).map(([timestamp, value]) => [timestamp, value] as const)
}

/** Preserve raw timestamps, merge duplicate timestamps, then compute a running total per series. */
function buildCumulativePoints(points: readonly TimePoint[]): TimePoint[] {
	const valuesByTimestamp = new Map<number, number>()

	for (const [timestamp, value] of points) {
		valuesByTimestamp.set(timestamp, (valuesByTimestamp.get(timestamp) ?? 0) + value)
	}

	let runningTotal = 0
	return Array.from(valuesByTimestamp.entries()).map(([timestamp, value]) => {
		runningTotal += value
		return [timestamp, runningTotal] as const
	})
}

/**
 * Convert normalized per-series point arrays into the dense dataset/charts shape expected by `MultiSeriesChart2`.
 *
 * `carry` mode is used for cumulative lines so every series keeps its last cumulative value at shared timestamps
 * instead of dropping to `null` and creating visual gaps.
 */
function buildChartSpec(series: BuiltSeries[], missingValueMode: MissingValueMode = 'null'): TimeSeriesChartSpec {
	if (series.length === 0) {
		return EMPTY_CHART_SPEC
	}

	const rowMap = new Map<number, Record<string, number | null>>()

	for (const item of series) {
		for (const [timestamp, value] of item.points) {
			const row = rowMap.get(timestamp) ?? { timestamp }
			row[item.name] = value
			rowMap.set(timestamp, row)
		}
	}

	const previousValuesBySeries: Record<string, number> = {}
	const source = ensureChronologicalRows(Array.from(rowMap.values())).map((row) => {
		const nextRow: Record<string, number | null> = { timestamp: Number(row.timestamp) }
		for (const item of series) {
			const value = row[item.name]

			if (typeof value === 'number') {
				nextRow[item.name] = value
				previousValuesBySeries[item.name] = value
				continue
			}

			nextRow[item.name] = missingValueMode === 'carry' ? (previousValuesBySeries[item.name] ?? 0) : null
		}
		return nextRow
	})

	return {
		dataset: {
			source,
			dimensions: ['timestamp', ...series.map((item) => item.name)]
		},
		charts: series.map((item) => ({
			type: item.type,
			name: item.name,
			encode: { x: 'timestamp', y: item.name },
			color: item.color,
			...(item.stack ? { stack: item.stack } : {})
		}))
	}
}

/**
 * Build a complete `MultiSeriesChart2` spec from normalized multi-series time data.
 *
 * Output guarantees:
 * - dense `dataset.source` rows keyed by `timestamp`
 * - one dimension per input series, preserved in input order
 * - one chart config per input series, preserved in input order
 * - missing values filled with `null`
 *
 * Input requirements:
 * - timestamps are already in milliseconds
 * - points are already sorted ascending per series
 * - values are already normalized to plain numbers
 */
export function buildTimeSeriesChart(input: TimeSeriesChartInput): TimeSeriesChartSpec {
	assertUniqueSeriesNames(input.series)
	assertAscendingPoints(input.series)

	switch (input.kind) {
		case 'periodBars':
			return buildChartSpec(
				input.series.map((item) => ({
					type: 'bar',
					name: item.name,
					color: item.color,
					stack: item.stack,
					points: groupSummedPoints(item.points, input.groupBy)
				}))
			)
		case 'periodLines':
			return buildChartSpec(
				input.series.map((item) => ({
					type: 'line',
					name: item.name,
					color: item.color,
					points: groupLastPoints(item.points, input.groupBy)
				}))
			)
		case 'cumulativeLines':
			return buildChartSpec(
				input.series.map((item) => ({
					type: 'line',
					name: item.name,
					color: item.color,
					points: buildCumulativePoints(item.points)
				})),
				'carry'
			)
		default:
			return assertNever(input)
	}
}
