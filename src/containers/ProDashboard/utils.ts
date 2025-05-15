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
