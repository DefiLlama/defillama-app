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

export const FLARE_PINK = '#E62058'
export const FLARE_ORANGE = '#FF7A1A'
export const FLARE_BLUE = '#2D63F6'
export const FLARE_GREEN = '#22c55e'
export const FLARE_RED = '#ef4444'
