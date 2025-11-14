import { generateConsistentChartColor } from './utils/colorManager'

export const convertToNumberFormat = (data: any[], convertToSeconds: boolean = false): [number, number][] => {
	if (!Array.isArray(data)) return []

	return data.map(([date, value]) => [
		typeof date === 'string'
			? convertToSeconds
				? parseInt(date, 10) / 1000
				: parseInt(date, 10) / 1
			: date / (convertToSeconds ? 1000 : 1),
		typeof value === 'string' ? parseFloat(value) : value
	])
}

export const normalizeHourlyToDaily = (
	data: [number, number][],
	aggregationType: 'last' | 'sum' = 'last'
): [number, number][] => {
	if (!data || data.length === 0) return []
	if (data.length === 1) return data

	const sortedData = [...data].sort((a, b) => a[0] - b[0])

	const avgTimeDiff =
		sortedData.slice(0, Math.min(10, sortedData.length - 1)).reduce((sum, point, idx, arr) => {
			if (idx === arr.length - 1) return sum
			return sum + (arr[idx + 1][0] - point[0])
		}, 0) / Math.min(9, sortedData.length - 1)

	const isHourlyData = avgTimeDiff < 24 * 60 * 60 && avgTimeDiff > 30 * 60

	if (!isHourlyData) {
		return data
	}

	const dailyData: { [dayKey: string]: { values: number[]; lastTimestamp: number; lastValue: number } } = {}

	sortedData.forEach(([timestamp, value]) => {
		const date = new Date(timestamp * 1000)
		date.setUTCHours(0, 0, 0, 0)
		const dayKey = (date.getTime() / 1000).toString()

		if (!dailyData[dayKey]) {
			dailyData[dayKey] = { values: [], lastTimestamp: timestamp, lastValue: value }
		}

		dailyData[dayKey].values.push(value)
		if (timestamp >= dailyData[dayKey].lastTimestamp) {
			dailyData[dayKey].lastTimestamp = timestamp
			dailyData[dayKey].lastValue = value
		}
	})

	return Object.entries(dailyData)
		.map(([dayTimestamp, { values, lastValue }]) => {
			const aggregatedValue = aggregationType === 'sum' ? values.reduce((sum, v) => sum + v, 0) : lastValue

			return [parseInt(dayTimestamp), aggregatedValue] as [number, number]
		})
		.sort((a, b) => a[0] - b[0])
}

export const getStartOfWeek = (date: Date): Date => {
	const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const day = dt.getDay()
	const diff = dt.getDate() - day + (day === 0 ? -6 : 1)
	return new Date(dt.setDate(diff))
}

export const getStartOfMonth = (date: Date): Date => {
	return new Date(date.getFullYear(), date.getMonth(), 1)
}

export const getStartOfQuarter = (date: Date): Date => {
	const month = date.getMonth()
	const quarterStartMonth = Math.floor(month / 3) * 3
	return new Date(date.getFullYear(), quarterStartMonth, 1)
}

export const groupData = (
	data: [string, number][] | undefined,
	grouping: 'day' | 'week' | 'month' | 'quarter' = 'day'
): [string, number][] => {
	if (!data || data.length === 0) return []

	if (grouping === 'day') {
		return data
	}

	const groupedData: { [key: string]: number } = {}

	data.forEach(([timestampStr, value]) => {
		const date = new Date(parseInt(timestampStr) * 1000)
		let groupKeyDate: Date

		if (grouping === 'week') {
			groupKeyDate = getStartOfWeek(date)
		} else if (grouping === 'month') {
			groupKeyDate = getStartOfMonth(date)
		} else if (grouping === 'quarter') {
			groupKeyDate = getStartOfQuarter(date)
		} else {
			groupKeyDate = date
		}

		groupKeyDate.setHours(0, 0, 0, 0)
		const groupKey = (groupKeyDate.getTime() / 1000).toString()

		if (groupedData[groupKey]) {
			groupedData[groupKey] += +value
		} else {
			groupedData[groupKey] = +value
		}
	})

	return Object.entries(groupedData).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
}

export const convertToCumulative = (data: [string, number][] | undefined): [string, number][] => {
	if (!data || data.length === 0) return []

	const sorted = [...data].sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
	let cumulative = 0

	return sorted.map(([timestamp, value]) => {
		cumulative += value
		return [timestamp, cumulative]
	})
}

// Icon URL helper functions
export const getItemIconUrl = (itemType: 'chain' | 'protocol', itemInfo: any, itemIdentifier: string): string => {
	if (itemType === 'chain') {
		// Replicate chainIconUrl logic from main utils
		return `https://icons.llamao.fi/icons/chains/rsz_${itemIdentifier?.toLowerCase()}?w=48&h=48`
	} else {
		if (itemInfo?.logo) return itemInfo.logo
		const key = (itemInfo?.id || itemIdentifier)?.toString()
		return `https://icons.llamao.fi/icons/protocols/${key}?w=48&h=48`
	}
}

export const generateChartColor = (itemName: string, fallbackColor: string): string => {
	const itemType = itemName?.includes('_') ? 'protocol' : 'chain'

	return generateConsistentChartColor(itemName, fallbackColor, itemType)
}
