/**
 * Chart formatting utilities.
 * These functions don't depend on echarts and can be safely imported
 * without pulling echarts into the bundle.
 */
import { formatNum, formattedNum } from '~/utils'

const SERIES_SYMBOL: Record<string, string> = { APY: '%', TVL: '$' }

type TooltipGroupBy = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'cumulative'

type TooltipRow = { marker: string; name: string; value: number }

/** Type guard that narrows `value` to a plain object (excludes arrays and nulls). */
export function isTooltipDataRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Safely cast `value` to a shallow-copied record, or return `null` if it isn't a plain object.
 * The shallow copy prevents mutation of the original tooltip data.
 */
export function asTooltipDataRecord(value: unknown): Record<string, unknown> | null {
	if (!isTooltipDataRecord(value)) return null
	return { ...value }
}

/**
 * Extract the x-axis timestamp (in ms) from the first ECharts tooltip param.
 * Handles multiple data shapes: object-row datasets with a `timestamp` field,
 * `[ts, y]` value arrays, nested value objects, and raw `axisValue` strings/numbers.
 * @returns The resolved timestamp, or `NaN` if none could be determined.
 */
function getAxisValueFromTooltipParams(first: any): number {
	const dataObj = asTooltipDataRecord(first?.data)
	if (dataObj && 'timestamp' in dataObj) {
		const ts = Number(dataObj.timestamp)
		if (Number.isFinite(ts)) return ts
	}

	if (Array.isArray(first?.value)) {
		const ts = Number(first.value[0])
		if (Number.isFinite(ts)) return ts
	}

	if (first?.value && typeof first.value === 'object' && 'timestamp' in first.value) {
		const ts = Number(first.value.timestamp)
		if (Number.isFinite(ts)) return ts
	}

	if (typeof first?.axisValue === 'number') return first.axisValue

	const axisValue = first?.axisValue
	if (axisValue == null) return Number.NaN
	const numeric = Number(axisValue)
	if (Number.isFinite(numeric)) return numeric
	const parsed = Date.parse(String(axisValue))
	return Number.isFinite(parsed) ? parsed : Number.NaN
}

/**
 * Extract the raw y-value for a named series from an ECharts tooltip item.
 * Tries object-row `data[seriesName]` first, then falls back to `value[1]`
 * (array format) and finally the bare `value` property.
 */
function getTooltipRawYValue(item: any, seriesName: string): any {
	const dataObj = asTooltipDataRecord(item?.data)

	// 1) Object-row dataset: `data[seriesName]` is the most reliable.
	if (dataObj && seriesName in dataObj) return dataObj[seriesName]

	// 2) Fallback: value array (e.g. [ts, y]).
	if (Array.isArray(item?.value)) return item.value[1]

	// 3) Final fallback: direct value.
	return item?.value
}

/**
 * Factory that returns an ECharts tooltip formatter optimised for inflow/outflow charts.
 * Only the top-N series (ranked by absolute value) are shown individually; the rest are
 * collapsed into a single "Others" row. A bolded total line is appended at the bottom.
 *
 * @param groupBy - Date grouping used to format the header date.
 * @param valueSymbol - Unit symbol (`'$'`, `'%'`, etc.) passed to {@link formatTooltipValue}.
 * @param topN - Maximum number of individual series rows to display.
 * @param othersLabel - Label for the aggregated remainder row.
 * @param totalLabel - Label for the sum-total row.
 */
export function createInflowsTooltipFormatter({
	groupBy = 'daily',
	valueSymbol,
	topN = 10,
	othersLabel = 'Others',
	totalLabel = 'Total Inflows'
}: {
	groupBy?: TooltipGroupBy
	valueSymbol: string
	topN?: number
	othersLabel?: string
	totalLabel?: string
}) {
	return (params: any) => {
		const items = Array.isArray(params) ? params : params ? [params] : []
		if (items.length === 0) return ''

		const axisValue = getAxisValueFromTooltipParams(items[0])
		const chartdate = Number.isFinite(axisValue) ? formatTooltipChartDate(axisValue, groupBy) : ''

		// Keep top-N by absolute value, stored ASC by abs (trim from front; render reversed).
		const topAbs: TooltipRow[] = []

		let total = 0

		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			const name = item?.seriesName
			if (!name) continue
			const rawValue = getTooltipRawYValue(item, name)
			const value =
				rawValue == null || rawValue === '-' ? null : typeof rawValue === 'number' ? rawValue : Number(rawValue)
			if (value == null || Number.isNaN(value) || value === 0) continue

			total += value

			if (topN <= 0) continue

			const absValue = Math.abs(value)
			const minAbs = topAbs.length > 0 ? Math.abs(topAbs[0].value) : 0
			if (topAbs.length < topN || absValue > minAbs) {
				const row: TooltipRow = { marker: item?.marker ?? '', name, value }
				// Insert sorted by abs(value) ASC
				topAbs.push(row)
				let j = topAbs.length - 1
				while (j > 0 && Math.abs(topAbs[j - 1].value) > Math.abs(topAbs[j].value)) {
					const tmp = topAbs[j - 1]
					topAbs[j - 1] = topAbs[j]
					topAbs[j] = tmp
					j--
				}
				if (topAbs.length > topN) topAbs.shift()
			}
		}

		// For single-series charts, don't show "Others" / "Total" (it becomes redundant).
		if (topAbs.length <= 1) {
			if (topAbs.length === 0) return chartdate
			const curr = topAbs[0]
			return (
				chartdate +
				`<li style="list-style:none">${curr.marker}${curr.name}&nbsp;&nbsp;${formatTooltipValue(curr.value, valueSymbol)}</li>`
			)
		}

		const selectedSum = topAbs.reduce((acc, r) => acc + r.value, 0)

		let others = total - selectedSum
		// Guard against floating-point epsilons creating a stray "Others" row.
		const EPSILON = 1e-8
		if (Math.abs(others) < EPSILON) others = 0

		let vals = ''

		// topAbs is ASC by abs; render it DESC by abs.
		for (let i = topAbs.length - 1; i >= 0; i--) {
			const curr = topAbs[i]
			vals += `<li style="list-style:none">${curr.marker}${curr.name}&nbsp;&nbsp;${formatTooltipValue(curr.value, valueSymbol)}</li>`
		}

		if (others !== 0) {
			vals += `<li style="list-style:none">${othersLabel}&nbsp;&nbsp;${formatTooltipValue(others, valueSymbol)}</li>`
		}

		vals += `<li style="list-style:none;font-weight:600">${totalLabel}&nbsp;&nbsp;${formatTooltipValue(total, valueSymbol)}</li>`

		return chartdate + vals
	}
}

/**
 * Factory that returns an ECharts tooltip formatter showing all non-zero series
 * sorted by absolute value (descending) with a bolded total row at the bottom.
 *
 * @param groupBy - Date grouping used to format the header date.
 * @param valueSymbol - Unit symbol (`'$'`, `'%'`, etc.) passed to {@link formatTooltipValue}.
 * @param totalLabel - Label for the sum-total row.
 */
export function createAggregateTooltipFormatter({
	groupBy = 'daily',
	valueSymbol,
	totalLabel = 'Total'
}: {
	groupBy?: TooltipGroupBy
	valueSymbol: string
	totalLabel?: string
}) {
	return (params: any) => {
		const items = Array.isArray(params) ? params : params ? [params] : []
		if (items.length === 0) return ''

		const axisValue = getAxisValueFromTooltipParams(items[0])
		const chartdate = Number.isFinite(axisValue) ? formatTooltipChartDate(axisValue, groupBy) : ''

		const parsed = items
			.map((item: any) => {
				const name = item?.seriesName
				if (!name) return null
				const rawValue = getTooltipRawYValue(item, name)
				const value =
					rawValue == null || rawValue === '-' ? null : typeof rawValue === 'number' ? rawValue : Number(rawValue)
				if (value == null || Number.isNaN(value) || value === 0) return null
				return { marker: item?.marker ?? '', name, value }
			})
			.filter(Boolean) as Array<{ marker: string; name: string; value: number }>

		parsed.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

		const vals = parsed.reduce(
			(prev, curr) =>
				prev +
				`<li style="list-style:none">${curr.marker}${curr.name}&nbsp;&nbsp;${formatTooltipValue(curr.value, valueSymbol)}</li>`,
			''
		)
		const total = parsed.reduce((acc, curr) => acc + curr.value, 0)
		const totalLine = `<li style="list-style:none;font-weight:600">${totalLabel}&nbsp;&nbsp;${formatTooltipValue(total, valueSymbol)}</li>`

		return chartdate + vals + totalLine
	}
}

/**
 * Tooltip formatter for dual-axis TVL + APY charts used with MultiSeriesChart2.
 * Shows APY values with '%' and TVL values with '$'.
 */
export function formatTvlApyTooltip(params: any) {
	const items = Array.isArray(params) ? params : params ? [params] : []
	if (items.length === 0) return ''

	const first = items[0]
	const dataObj = asTooltipDataRecord(first?.data)
	const timestamp = dataObj?.timestamp ?? first?.axisValue
	const chartdate =
		typeof timestamp === 'number' && Number.isFinite(timestamp) ? formatTooltipChartDate(timestamp, 'daily') : ''

	const vals = items
		.map((item: any) => {
			const name = item?.seriesName
			if (!name) return null

			const itemData = asTooltipDataRecord(item?.data)
			const rawValue = itemData ? itemData[name] : item?.value?.[1]
			const value = rawValue == null ? null : typeof rawValue === 'number' ? rawValue : Number(rawValue)
			if (value == null || Number.isNaN(value)) return null

			const symbol = SERIES_SYMBOL[name] ?? ''
			const formatted = symbol === '$' ? formattedNum(value, true) : formatNum(value, 5, symbol || undefined)
			return { marker: item.marker, name, value, formatted }
		})
		.filter(Boolean)
		.sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value))

	return (
		chartdate +
		vals.reduce(
			(prev: string, curr: any) =>
				prev + `<li style="list-style:none">${curr.marker}${curr.name}&nbsp;&nbsp;${curr.formatted}</li>`,
			''
		)
	)
}

/**
 * Format a numeric value for display in a tooltip, applying the appropriate unit.
 * `'$'` uses abbreviated currency formatting, `'%'` rounds to two decimals,
 * and any other symbol is appended after a formatted number.
 */
export const formatTooltipValue = (value: number, symbol: string) => {
	switch (symbol) {
		case '$':
			return formattedNum(value, true)
		case '%':
			return `${Math.round(value * 100) / 100} %`
		default:
			return `${formattedNum(value)} ${symbol}`
	}
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Format a timestamp (in ms) as a human-readable date string for chart tooltips.
 * The output format varies by `groupBy`:
 * - `'weekly'`    → `"DD MMM - DD MMM YYYY"` (Mon–Sun range)
 * - `'monthly'`   → `"MMM 1 - lastDay, YYYY"`
 * - `'quarterly'` → `"MMM 1 - MMM lastDay, YYYY"`
 * - `'yearly'`    → `"Jan 1 - Dec 31, YYYY"`
 * - `'daily'` / `'cumulative'` → `"DD MMM YYYY"` (with time if intraday and `hideTime` is false)
 *
 * @param value - Timestamp in milliseconds.
 * @param groupBy - Temporal grouping that determines the date format.
 * @param hideTime - When true, suppresses the time portion for intraday daily timestamps.
 */
export function formatTooltipChartDate(value: number, groupBy: TooltipGroupBy, hideTime?: boolean) {
	const date = new Date(value)

	switch (groupBy) {
		case 'weekly':
			return getStartAndEndDayOfTheWeek(value)
		case 'monthly':
			return `${monthNames[date.getUTCMonth()]} 1 - ${lastDayOfMonth(value)}, ${date.getUTCFullYear()}`
		case 'quarterly':
			return getQuarterDateRange(value)
		case 'yearly':
			return `Jan 1 - Dec 31, ${date.getUTCFullYear()}`
		default: {
			// daily , cumulative
			if (date.getUTCHours() !== 0 && !hideTime) {
				return date.toLocaleDateString(undefined, {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					timeZone: 'UTC'
				})
			}
			return `${date.getUTCDate().toString().padStart(2, '0')} ${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`
		}
	}
}

/**
 * Format a timestamp (in ms) as a short locale date string (`MM/DD/YYYY` in most locales)
 * for use in chart emphasis/highlight labels.
 */
export function formatChartEmphasisDate(value: number) {
	const date = new Date(value)
	return date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'UTC'
	})
}

/**
 * Format a 7-day range string from a week-ending timestamp.
 * Cross-month and cross-year boundaries are handled by conditionally including
 * the month/year on the start date only when they differ from the end date.
 * @param value - Timestamp (ms) of the last day (Sunday) of the week.
 */
function getStartAndEndDayOfTheWeek(value: number) {
	const current = new Date(value)
	const past = new Date(value - 6 * 24 * 60 * 60 * 1000)

	const currentMonth = monthNames[current.getUTCMonth()]
	const pastMonth = monthNames[past.getUTCMonth()]
	const currentYear = current.getUTCFullYear()
	const pastYear = past.getUTCFullYear()

	return `${past.getUTCDate().toString().padStart(2, '0')}${pastMonth !== currentMonth ? ` ${pastMonth}` : ''}${
		pastYear !== currentYear ? ` ${pastYear}` : ''
	} - ${current.getUTCDate().toString().padStart(2, '0')} ${currentMonth} ${currentYear}`
}

/** @returns The last calendar day (1–31) of the month containing the given timestamp. */
function lastDayOfMonth(dateString: number) {
	let date = new Date(dateString)

	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Format a fiscal-quarter date range string (e.g. `"Jan 1 - Mar 31, 2024"`)
 * from a timestamp falling anywhere within that quarter.
 */
function getQuarterDateRange(value: number) {
	const date = new Date(value)
	const month = date.getUTCMonth()
	const year = date.getUTCFullYear()
	const quarterStartMonth = Math.floor(month / 3) * 3
	const quarterEndMonth = quarterStartMonth + 2

	const quarterEndDate = new Date(year, quarterEndMonth + 1, 0).getUTCDate()

	return `${monthNames[quarterStartMonth]} 1 - ${monthNames[quarterEndMonth]} ${quarterEndDate}, ${year}`
}
