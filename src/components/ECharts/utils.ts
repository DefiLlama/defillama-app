import type { ChartTimeGrouping, ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { firstDayOfMonth, firstDayOfQuarter, firstDayOfYear, lastDayOfWeek, toNiceCsvDate } from '~/utils'

/** Generate a random 6-digit hex colour string (e.g. `"#a3f04c"`). */
export function stringToColour() {
	return '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')
}

/**
 * Transform raw time-series tuples into `[timestampMs, value]` pairs for ECharts bar series.
 * Values within the same period are **summed** (appropriate for bar/volume charts).
 * When `groupBy` is `'cumulative'`, a running total is computed across all periods.
 *
 * @param data - Raw data as `[date, value]` tuples (date in seconds or ms depending on `dateInMs`).
 * @param groupBy - Temporal bucketing strategy: `'daily'` preserves incoming timestamps,
 *   `'weekly'`/`'monthly'` bucket by week/month end/start, and `'cumulative'` computes a running total.
 * @param dateInMs - When true, incoming dates are already in milliseconds (default: seconds).
 * @param denominationPriceHistory - Optional price map to convert values into an alternative denomination.
 * @returns Chronologically sorted `[timestampMs, value | null]` tuples.
 */
type FormatterMode = 'sum' | 'last'

type FormatterInput = {
	data: Array<[string | number, number]>
	groupBy: ChartTimeGroupingWithCumulative
	dateInMs?: boolean
	denominationPriceHistory: Record<string, number> | null
}

export const getBucketTimestampSec = (timestampSec: number, groupBy: ChartTimeGrouping): number => {
	switch (groupBy) {
		case 'daily':
			return Math.floor(timestampSec / 86400) * 86400
		case 'weekly':
			return lastDayOfWeek(timestampSec)
		case 'monthly':
			return firstDayOfMonth(timestampSec)
		case 'quarterly':
			return firstDayOfQuarter(timestampSec)
		case 'yearly':
			return firstDayOfYear(timestampSec)
	}
}

export const getBucketTimestampMs = (timestampMs: number, groupBy: ChartTimeGrouping): number => {
	return getBucketTimestampSec(timestampMs / 1e3, groupBy) * 1e3
}

const formatDailyChart = ({
	data,
	dateInMs = false,
	denominationPriceHistory
}: Pick<FormatterInput, 'data' | 'dateInMs' | 'denominationPriceHistory'>): Array<[number, number | null]> => {
	return data.map(([date, value]) => {
		const timestampSec = dateInMs ? +date / 1e3 : +date
		const timestampMs = dateInMs ? +date : +date * 1e3
		const price = denominationPriceHistory?.[String(timestampSec)] ?? denominationPriceHistory?.[String(timestampMs)]
		return [timestampMs, price ? value / price : denominationPriceHistory ? null : value]
	})
}

const formatGroupedChart = ({
	data,
	groupBy,
	dateInMs = false,
	denominationPriceHistory,
	mode
}: FormatterInput & { mode: FormatterMode }): Array<[number, number | null]> => {
	if (groupBy === 'daily') {
		return formatDailyChart({ data, dateInMs, denominationPriceHistory })
	}

	if (groupBy === 'cumulative' && mode === 'last') {
		return formatDailyChart({ data, dateInMs, denominationPriceHistory })
	}

	const valuesByTimestamp = new Map<number, number | null>()
	let cumulativeTotal = 0

	for (const [date, value] of data) {
		const timestampSec = dateInMs ? +date / 1e3 : +date
		const timestampMs = dateInMs ? +date : +date * 1e3
		const bucketTimestampMs =
			groupBy === 'cumulative' ? timestampMs : getBucketTimestampSec(timestampSec, groupBy) * 1e3
		const price = denominationPriceHistory?.[String(timestampSec)] ?? denominationPriceHistory?.[String(timestampMs)]

		if (mode === 'sum') {
			if (denominationPriceHistory && !price) continue
			const nextValue = denominationPriceHistory ? value / price! : value
			const currentValue = valuesByTimestamp.get(bucketTimestampMs) ?? 0
			valuesByTimestamp.set(
				bucketTimestampMs,
				groupBy === 'cumulative' ? currentValue + nextValue + cumulativeTotal : currentValue + nextValue
			)
			if (groupBy === 'cumulative') cumulativeTotal += nextValue
			continue
		}

		valuesByTimestamp.set(bucketTimestampMs, denominationPriceHistory ? (price ? value / price : null) : value)
	}

	return Array.from(valuesByTimestamp.entries()).sort((a, b) => a[0] - b[0])
}

export const formatBarChart = ({
	data,
	groupBy,
	dateInMs = false,
	denominationPriceHistory
}: FormatterInput): Array<[number, number | null]> =>
	formatGroupedChart({ data, groupBy, dateInMs, denominationPriceHistory, mode: 'sum' })

/**
 * Transform raw time-series tuples into `[timestampMs, value]` pairs for ECharts line series.
 * Unlike {@link formatBarChart}, values within the same period are **not** summed — the last
 * value for each bucket wins (point-in-time snapshot, appropriate for line charts).
 *
 * `'cumulative'` is intentionally not handled here; callers either precompute running totals
 * or reuse `formatBarChart(..., 'cumulative')` and render the result as a line.
 *
 * @param data - Raw data as `[date, value]` tuples (date in seconds or ms depending on `dateInMs`).
 * @param groupBy - Temporal bucketing strategy.
 * @param dateInMs - When true, incoming dates are already in milliseconds (default: seconds).
 * @param denominationPriceHistory - Optional price map to convert values into an alternative denomination.
 * @returns Chronologically sorted `[timestampMs, value | null]` tuples.
 */
export const formatLineChart = ({
	data,
	groupBy,
	dateInMs = false,
	denominationPriceHistory
}: FormatterInput): Array<[number, number | null]> =>
	formatGroupedChart({ data, groupBy, dateInMs, denominationPriceHistory, mode: 'last' })

/**
 * Merge multiple named chart series into a single CSV-ready structure.
 * Each row contains a timestamp, a human-readable date, and one column per series.
 * Rows are sorted chronologically by timestamp.
 *
 * @param data - Map of series name → `[timestampMs, value]` tuples.
 * @param filename - Desired filename for the exported CSV.
 * @returns `{ filename, rows }` where rows include a header row followed by data rows.
 */
export function prepareChartCsv(data: Record<string, Array<[string | number, number | null]>>, filename: string) {
	let rows = []
	const charts = []
	const dateStore = {}
	for (const chartName in data) {
		charts.push(chartName)
		for (const [date, value] of data[chartName]) {
			if (!dateStore[date]) {
				dateStore[date] = {}
			}
			dateStore[date][chartName] = value
		}
	}
	rows.push(['Timestamp', 'Date', ...charts])
	for (const date in dateStore) {
		const values = []
		for (const chartName in data) {
			values.push(dateStore[date]?.[chartName] ?? '')
		}
		rows.push([date, toNiceCsvDate(+date / 1000), ...values])
	}

	return { filename, rows: rows.sort((a, b) => a[0] - b[0]) }
}

/**
 * Return rows sorted by `timestamp` ascending. Performs an optimistic linear scan first —
 * if the rows are already in order the original array is returned without allocating a copy.
 * Only falls back to a full sort when an out-of-order element is detected.
 */
export function ensureChronologicalRows<T extends { timestamp?: number | string }>(rows: T[]) {
	if (rows.length < 2) return rows

	let prev = Number(rows[0]?.timestamp)
	for (let i = 1; i < rows.length; i++) {
		const curr = Number(rows[i]?.timestamp)
		if (!Number.isFinite(prev) || !Number.isFinite(curr) || curr < prev) {
			return rows.toSorted((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0))
		}
		prev = curr
	}

	return rows
}

/**
 * Normalize heterogeneous data (object map or array of records) into a sorted
 * `{ name, value }[]` array suitable for ECharts pie/doughnut series.
 * When `limit` is specified, only the top-N slices are kept and the remainder
 * is merged into a single "Others" entry. Existing "Others" entries in the
 * source data are consolidated to avoid duplicates.
 *
 * @param data - Source data as either a `Record<name, value>` or an array of keyed objects.
 * @param sliceIdentifier - Key used to read the slice name from array entries (default `'name'`).
 * @param sliceValue - Key used to read the numeric value from array entries (default `'value'`).
 * @param limit - Maximum number of individual slices before grouping the rest into "Others".
 */
export const preparePieChartData = ({
	data,
	sliceIdentifier = 'name',
	sliceValue = 'value',
	limit
}: {
	data: Record<string, number> | Array<Record<string, any>>
	sliceIdentifier?: string
	sliceValue?: string
	limit?: number
}) => {
	let pieData: Array<{ name: string; value: number }> = []

	if (Array.isArray(data)) {
		pieData = data.map((entry) => {
			return {
				name: entry[sliceIdentifier],
				value: Number(entry[sliceValue])
			}
		})
	} else {
		pieData = Object.entries(data).map(([name, value]) => {
			return {
				name: name,
				value: Number(value)
			}
		})
	}

	pieData = pieData.toSorted((a, b) => b.value - a.value)

	if (!limit) {
		return pieData
	}

	const mainSlices = pieData.slice(0, limit)
	const otherSlices = pieData.slice(limit)

	const othersIndex = mainSlices.findIndex((slice) => slice.name === 'Others')
	let othersValueFromMain = 0
	let filteredMainSlices = mainSlices

	if (othersIndex !== -1) {
		othersValueFromMain = mainSlices[othersIndex].value
		filteredMainSlices = mainSlices.filter((_, index) => index !== othersIndex)
	}

	const otherSlicesValue =
		otherSlices.reduce((acc, curr) => {
			return acc + curr.value
		}, 0) + othersValueFromMain

	if (otherSlicesValue > 0) {
		return [...filteredMainSlices, { name: 'Others', value: otherSlicesValue }]
	}

	return filteredMainSlices
}

/**
 * Recursively merge `source` into `target`, returning a new object.
 * - Arrays are concatenated (target first, then source).
 * - Nested plain objects are merged recursively.
 * - Primitives and non-object sources overwrite the target value.
 * - `null`/`undefined` sources leave the target unchanged.
 */
export function mergeDeep(target: any, source: any): any {
	if (source == null) return target
	if (Array.isArray(source) && Array.isArray(target)) return [...target, ...source]
	if (typeof source !== 'object') return source
	if (Array.isArray(source)) return source

	const result = { ...target }
	for (const key in source) {
		if (source.hasOwnProperty(key)) {
			if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
				result[key] = mergeDeep(target[key] || {}, source[key])
			} else {
				result[key] = source[key]
			}
		}
	}
	return result
}
