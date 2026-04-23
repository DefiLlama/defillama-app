const THREE_MONTH_DAYS = 90

export function lastNDaysZoom(dataLength: number, days: number = THREE_MONTH_DAYS): any {
	if (dataLength <= days) return undefined
	const start = ((dataLength - days) / dataLength) * 100
	return {
		dataZoom: [
			{ start, end: 100 },
			{ start, end: 100 }
		]
	}
}
