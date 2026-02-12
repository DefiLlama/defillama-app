type ChartEntry = [number, number]

export const get24hChange = (chart: ChartEntry[]): string | number => {
	if (!chart?.length) return 0
	const yesterday = chart[chart.length - 2]?.[1]
	const today = chart[chart.length - 1][1]

	return (((today - yesterday) / yesterday) * 100).toFixed(2)
}

export const getNDaysChange = (chart: ChartEntry[], days = 7): string | number => {
	if (!chart?.length) return 0
	const yesterday = chart[chart.length - 1 - days][1]
	const today = chart[chart.length - 1][1]

	return (((today - yesterday) / yesterday) * 100).toFixed(2)
}

export const getTotalNDaysSum = (chart: ChartEntry[], days = 7): number => {
	if (!chart?.length) return 0
	return chart.slice(chart.length - days).reduce((sum, val) => sum + val[1], 0)
}
