export const getAnnualizedRatio = (numerator?: number | null, denominator?: number | null) => {
	if (numerator == null || denominator == null) {
		return null
	}
	if (denominator === 0) {
		return null
	}
	return Number((numerator / (denominator * 12)).toFixed(2))
}
