import { firstDayOfMonth, lastDayOfWeek, toNiceCsvDate } from '~/utils'

export function stringToColour() {
	return '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')
}

export const formatBarChart = ({
	data,
	groupBy,
	dateInMs = false,
	denominationPriceHistory
}: {
	data: Array<[string | number, number]>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	dateInMs?: boolean
	denominationPriceHistory: Record<string, number> | null
}): Array<[number, number | null]> => {
	const getDenominationPrice = (timestampSec: number, timestampMs: number) =>
		denominationPriceHistory?.[String(timestampSec)] ?? denominationPriceHistory?.[String(timestampMs)]

	if (['weekly', 'monthly', 'cumulative'].includes(groupBy)) {
		const store: Record<string, number> = {}
		let total = 0
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'
		for (const [date, value] of data) {
			const timestampSec = dateInMs ? +date / 1e3 : +date
			const timestampMs = dateInMs ? +date : +date * 1e3
			const dateKey = isWeekly
				? lastDayOfWeek(timestampSec)
				: isMonthly
					? firstDayOfMonth(timestampSec)
					: dateInMs
						? timestampSec
						: +date
			// sum up values as it is bar chart
			if (denominationPriceHistory) {
				const price = getDenominationPrice(timestampSec, timestampMs)
				if (!price) continue
				const converted = value / price
				store[dateKey] = (store[dateKey] ?? 0) + converted + total
				if (isCumulative) total += converted
			} else {
				store[dateKey] = (store[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}
		const finalChart: Array<[number, number]> = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		// `for...in` over object keys is not guaranteed to be chronological.
		// Many ECharts features (eg. `dataZoom`) and "latest" lookups assume sorted x-values.
		return finalChart.sort((a, b) => a[0] - b[0])
	}
	if (denominationPriceHistory) {
		return data.map(([date, value]) => {
			const timestampSec = dateInMs ? +date / 1e3 : +date
			const timestampMs = dateInMs ? +date : +date * 1e3
			const price = getDenominationPrice(timestampSec, timestampMs)
			return [dateInMs ? +date : +date * 1e3, price ? value / price : null]
		})
	} else {
		return dateInMs ? (data as Array<[number, number]>) : data.map(([date, value]) => [+date * 1e3, value])
	}
}

export const formatLineChart = ({
	data,
	groupBy,
	dateInMs = false,
	denominationPriceHistory
}: {
	data: Array<[string | number, number]>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	dateInMs?: boolean
	denominationPriceHistory: Record<string, number> | null
}): Array<[number, number | null]> => {
	const getDenominationPrice = (timestampSec: number, timestampMs: number) =>
		denominationPriceHistory?.[String(timestampSec)] ?? denominationPriceHistory?.[String(timestampMs)]

	if (['weekly', 'monthly'].includes(groupBy)) {
		const store: Record<string, number | null> = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		for (const [date, value] of data) {
			const timestampSec = dateInMs ? +date / 1e3 : +date
			const timestampMs = dateInMs ? +date : +date * 1e3
			const dateKey = isWeekly
				? lastDayOfWeek(timestampSec)
				: isMonthly
					? firstDayOfMonth(timestampSec)
					: dateInMs
						? timestampSec
						: +date
			// do not sum up values, just use the last value for each date
			const denomPrice = denominationPriceHistory ? getDenominationPrice(timestampSec, timestampMs) : null
			const finalValue = denominationPriceHistory ? (denomPrice ? value / denomPrice : null) : value
			store[dateKey] = finalValue
		}
		const finalChart: Array<[number, number | null]> = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		// `for...in` over object keys is not guaranteed to be chronological.
		return finalChart.sort((a, b) => a[0] - b[0])
	}
	if (denominationPriceHistory) {
		return data.map(([date, value]) => {
			const timestampSec = dateInMs ? +date / 1e3 : +date
			const timestampMs = dateInMs ? +date : +date * 1e3
			const price = getDenominationPrice(timestampSec, timestampMs)
			return [dateInMs ? +date : +date * 1e3, price ? value / price : null]
		})
	} else {
		return dateInMs ? (data as Array<[number, number]>) : data.map(([date, value]) => [+date * 1e3, value])
	}
}

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

// Deep merge function for nested objects
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
