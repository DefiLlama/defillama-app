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
}): Array<[number, number]> => {
	if (['weekly', 'monthly', 'cumulative'].includes(groupBy)) {
		const store = {}
		let total = 0
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'
		for (const [date, value] of data) {
			const dateKey = isWeekly
				? lastDayOfWeek(dateInMs ? +date : +date * 1e3)
				: isMonthly
					? firstDayOfMonth(dateInMs ? +date : +date * 1e3)
					: dateInMs
						? +date / 1e3
						: +date
			// sum up values as it is bar chart
			if (denominationPriceHistory) {
				const price = denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
				store[dateKey] = (store[dateKey] ?? 0) + (price ? value / price : 0) + total
				if (isCumulative && price) {
					total += value / price
				}
			} else {
				store[dateKey] = (store[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}
		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}
	if (denominationPriceHistory) {
		return data.map(([date, value]) => {
			const price = denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
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
}): Array<[number, number]> => {
	if (['weekly', 'monthly'].includes(groupBy)) {
		const store = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		for (const [date, value] of data) {
			const dateKey = isWeekly
				? lastDayOfWeek(dateInMs ? +date : +date * 1e3)
				: isMonthly
					? firstDayOfMonth(dateInMs ? +date : +date * 1e3)
					: dateInMs
						? +date / 1e3
						: +date
			// do not sum up values, just use the last value for each date
			const finalValue = denominationPriceHistory
				? denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
					? value / denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
					: null
				: value
			store[dateKey] = finalValue
		}
		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}
	if (denominationPriceHistory) {
		return data.map(([date, value]) => {
			const price = denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
			return [dateInMs ? +date : +date * 1e3, price ? value / price : null]
		})
	} else {
		return dateInMs ? (data as Array<[number, number]>) : data.map(([date, value]) => [+date * 1e3, value])
	}
}

export function prepareChartCsv(data: Record<string, Array<[string | number, number]>>, filename: string) {
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
