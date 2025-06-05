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

export const getStartOfWeek = (date: Date): Date => {
	const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const day = dt.getDay()
	const diff = dt.getDate() - day + (day === 0 ? -6 : 1)
	return new Date(dt.setDate(diff))
}

export const getStartOfMonth = (date: Date): Date => {
	return new Date(date.getFullYear(), date.getMonth(), 1)
}

export const groupData = (
	data: [string, number][] | undefined,
	grouping: 'day' | 'week' | 'month' = 'day'
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

// Icon URL helper functions
export const getItemIconUrl = (itemType: 'chain' | 'protocol', itemInfo: any, itemIdentifier: string): string => {
	if (itemType === 'chain') {
		// Replicate chainIconUrl logic from main utils
		return `https://icons.llamao.fi/icons/chains/rsz_${itemIdentifier?.toLowerCase()}?w=48&h=48`
	} else {
		// Protocol icon logic
		return itemInfo?.logo || `https://icons.llamao.fi/icons/protocols/${itemInfo?.id || itemIdentifier}.jpg`
	}
}

const CHART_COLORS = [
	'#FF6B6B', // Red
	'#4ECDC4', // Teal
	'#45B7D1', // Blue
	'#96CEB4', // Green
	'#FFEAA7', // Yellow
	'#DDA0DD', // Plum
	'#98D8C8', // Mint
	'#F7DC6F', // Light Yellow
	'#BB8FCE', // Light Purple
	'#85C1E9', // Light Blue
	'#F8C471', // Orange
	'#82E0AA', // Light Green
	'#F1948A', // Light Red
	'#85929E', // Gray
	'#D7BDE2' // Light Lavender
]

export const generateChartColor = (index: number, itemName: string, fallbackColor: string): string => {
	let hash = 0
	for (let i = 0; i < itemName.length; i++) {
		const char = itemName.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash
	}

	const colorIndex = (Math.abs(hash) + index) % CHART_COLORS.length
	return CHART_COLORS[colorIndex] || fallbackColor
}
