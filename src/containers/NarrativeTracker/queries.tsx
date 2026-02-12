import { fetchCategoryCoinPrices, fetchCategoryInfo, fetchCategoryPerformance, fetchCoinInfo } from './api'
import type { ICategoryInfoApiItem, PriceEntry, TimeSeriesEntry } from './api.types'
import type { CategoryPerformanceProps, IPctChangeRow, PerformanceTimeSeries } from './types'

export async function getCategoryInfo(): Promise<ICategoryInfoApiItem[]> {
	return fetchCategoryInfo()
}

function getCumulativeChangeOfPeriod(
	performanceTimeSeries: PerformanceTimeSeries,
	period: string,
	name: string
): number | null {
	const series = performanceTimeSeries[period]
	if (!Array.isArray(series) || series.length === 0) return null
	const lastEntry = series[series.length - 1]
	return lastEntry?.[name] ?? null
}

export async function getCategoryPerformance(): Promise<CategoryPerformanceProps> {
	const periods = ['7', '30', 'ytd', '365'] as const

	const [performanceEntries, info] = await Promise.all([
		Promise.all(
			periods.map(async (period): Promise<[string, TimeSeriesEntry[]]> => [
				period,
				await fetchCategoryPerformance(period)
			])
		),
		fetchCategoryInfo()
	])

	const performanceTimeSeries: PerformanceTimeSeries = Object.fromEntries(performanceEntries)

	const pctChanges: IPctChangeRow[] = info.map((i) => ({
		...i,
		change1W: getCumulativeChangeOfPeriod(performanceTimeSeries, '7', i.name),
		change1M: getCumulativeChangeOfPeriod(performanceTimeSeries, '30', i.name),
		change1Y: getCumulativeChangeOfPeriod(performanceTimeSeries, '365', i.name),
		changeYtd: getCumulativeChangeOfPeriod(performanceTimeSeries, 'ytd', i.name)
	}))

	return {
		pctChanges,
		performanceTimeSeries,
		areaChartLegend: info.map((i) => i.name),
		isCoinPage: false
	}
}

function calculateCumulativePercentageChange(
	data: PriceEntry[],
	mapping: Record<string, string>,
	timeframe: number | 'ytd' | null
): TimeSeriesEntry[] {
	const filterData = (entries: PriceEntry[], tf: number | 'ytd' | null): PriceEntry[] => {
		const now = new Date()
		if (tf === 'ytd') {
			const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
			return entries.filter((item) => new Date(item[1]) >= startOfYear)
		} else if (typeof tf === 'number') {
			now.setUTCDate(now.getUTCDate() - tf)
			return entries.filter((item) => new Date(item[1]) >= now)
		}
		return entries
	}

	const sortedData = [...data].sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
	const filteredData = filterData(sortedData, timeframe)

	// group by id
	const groupedData: Record<string, Array<{ timestamp: number; price: number }>> = {}
	for (const [id, timestamp, price] of filteredData) {
		if (!groupedData[id]) groupedData[id] = []
		groupedData[id].push({
			timestamp: Math.floor(new Date(timestamp).getTime() / 1000),
			price: parseFloat(price)
		})
	}

	// calculate cumulative percentage change for each id
	const results: Record<number, Record<string, number>> = {}
	for (const [id, prices] of Object.entries(groupedData)) {
		const initialPrice = prices[0].price
		if (initialPrice === 0) continue
		const coinName = mapping[id]
		if (!coinName) continue
		for (const { timestamp, price } of prices) {
			if (!results[timestamp]) results[timestamp] = {}
			results[timestamp][coinName] = ((price - initialPrice) / initialPrice) * 100
		}
	}

	// format for chart
	const chartData: TimeSeriesEntry[] = []
	for (const [timestamp, values] of Object.entries(results)) {
		chartData.push({
			date: parseInt(timestamp, 10),
			...values
		})
	}
	return chartData
}

export async function getCoinPerformance(categoryId: string): Promise<CategoryPerformanceProps> {
	const [prices, coinInfo, categories] = await Promise.all([
		fetchCategoryCoinPrices(categoryId),
		fetchCoinInfo(categoryId),
		getCategoryInfo()
	])

	const coinsUniqueIncludingDenomCoins: Record<string, string> = Object.fromEntries(
		coinInfo.map((c) => [c.id, c.name])
	)

	const ts7 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 7)
	const ts30 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 30)
	const ts365 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, null)
	const tsYtd = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 'ytd')

	const performanceTimeSeries: PerformanceTimeSeries = {
		'7': ts7,
		'30': ts30,
		'365': ts365,
		ytd: tsYtd
	}

	const pctChanges: IPctChangeRow[] = coinInfo.map((i) => ({
		...i,
		change1W: getCumulativeChangeOfPeriod(performanceTimeSeries, '7', i.name),
		change1M: getCumulativeChangeOfPeriod(performanceTimeSeries, '30', i.name),
		change1Y: getCumulativeChangeOfPeriod(performanceTimeSeries, '365', i.name),
		changeYtd: getCumulativeChangeOfPeriod(performanceTimeSeries, 'ytd', i.name)
	}))

	return {
		pctChanges,
		performanceTimeSeries,
		areaChartLegend: (() => {
			const legend: string[] = []
			for (const i of coinInfo) {
				if (i.name !== 'Bitcoin' && i.name !== 'Ethereum' && i.name !== 'Solana') legend.push(i.name)
			}
			return legend
		})(),
		isCoinPage: true,
		categoryName: categories.find((i) => i.id === categoryId)?.name
	}
}
