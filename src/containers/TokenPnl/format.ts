export const formatPercent = (value: number) => {
	if (!Number.isFinite(value)) return '0%'
	const formatted = value.toFixed(Math.abs(value) < 1 ? 2 : 1)
	const prefix = value > 0 ? '+' : value < 0 ? '' : ''
	return `${prefix}${formatted}%`
}

export const formatDateLabel = (timestamp: number) => {
	return new Date(timestamp * 1000).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric'
	})
}
