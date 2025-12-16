import { CATEGORY_COIN_PRICES_API, CATEGORY_INFO_API, CATEGORY_PERFORMANCE_API, COINS_INFO_API } from '~/constants'
import { fetchJson } from '~/utils/async'

export async function getCategoryInfo() {
	const data = await fetchJson(CATEGORY_INFO_API).catch(() => [])
	return data
}

export async function getCategoryPerformance() {
	const performanceTimeSeries = Object.fromEntries(
		await Promise.all(
			['7', '30', 'ytd', '365'].map(async (period) => [
				period,
				await fetchJson(`${CATEGORY_PERFORMANCE_API}/${period}`).catch(() => [])
			])
		)
	)

	const info = await fetchJson(CATEGORY_INFO_API).catch(() => [])
	const getCumulativeChangeOfPeriod = (period, name) => performanceTimeSeries[period].slice(-1)?.[0]?.[name] ?? null
	const pctChanges = info.map((i) => ({
		...i,
		change1W: getCumulativeChangeOfPeriod('7', i.name),
		change1M: getCumulativeChangeOfPeriod('30', i.name),
		change1Y: getCumulativeChangeOfPeriod('365', i.name),
		changeYtd: getCumulativeChangeOfPeriod('ytd', i.name)
	}))

	return {
		pctChanges,
		performanceTimeSeries,
		areaChartLegend: info.map((i) => i.name),
		isCoinPage: false
	}
}

export async function getCoinPerformance(categoryId) {
	// for coins per category we fetch the full 365 series per coin in a given category
	// we calculate the different pct change series in here which can all be derived from that single series
	// using different reference prices (eg 7d, 30d, ytd, 365d)
	const calculateCumulativePercentageChange = (data, mapping, timeframe) => {
		// helper func to filter data based on timeframe
		const filterData = (data, timeframe) => {
			const now = new Date()
			if (timeframe === 'ytd') {
				const startOfYear = new Date(now.getFullYear(), 0, 1)
				return data.filter((item) => new Date(item[1]) >= startOfYear)
			} else if (typeof timeframe === 'number') {
				const startDate = new Date(now.setDate(now.getDate() - timeframe))
				return data.filter((item) => new Date(item[1]) >= startDate)
			}
			return data
		}

		const sortedData = data.sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())

		// filter on timeframe
		const filteredData = filterData(sortedData, timeframe)

		// group by id
		const groupedData = filteredData.reduce((acc, item) => {
			const [id, timestamp, price] = item
			if (!acc[id]) acc[id] = []
			acc[id].push({
				timestamp: Math.floor(new Date(timestamp).getTime() / 1000),
				price: parseFloat(price)
			})
			return acc
		}, {})

		// calculate cumulative percentage change for each id
		const results = {}
		Object.keys(groupedData).forEach((id) => {
			const prices = groupedData[id]
			const initialPrice = prices[0].price
			prices.forEach(({ timestamp, price }) => {
				if (!results[timestamp]) results[timestamp] = {}
				const percentageChange = ((price - initialPrice) / initialPrice) * 100
				results[timestamp][mapping[id]] = percentageChange
			})
		})

		// format for chart
		return Object.entries(results).map(([timestamp, changes]) => ({
			date: parseInt(timestamp),
			...(changes as object)
		}))
	}

	const prices = await fetchJson(`${CATEGORY_COIN_PRICES_API}/${categoryId}`)
	const coinInfo = await fetchJson(`${COINS_INFO_API}/${categoryId}`)

	const coinsInCategory = coinInfo.map((c) => [c.id, c.name])

	const coinsUniqueIncludingDenomCoins = Object.fromEntries(coinsInCategory)

	const ts7 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 7)
	const ts30 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 30)
	const ts365 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, null)
	const tsYtd = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 'ytd')

	const performanceTimeSeries = {}
	performanceTimeSeries['7'] = ts7
	performanceTimeSeries['30'] = ts30
	performanceTimeSeries['365'] = ts365
	performanceTimeSeries['ytd'] = tsYtd

	const getCumulativeChangeOfPeriod = (period, name) => performanceTimeSeries[period].slice(-1)[0]?.[name] ?? null
	const pctChanges = coinInfo.map((i) => ({
		...i,
		change1W: getCumulativeChangeOfPeriod('7', i.name),
		change1M: getCumulativeChangeOfPeriod('30', i.name),
		change1Y: getCumulativeChangeOfPeriod('365', i.name),
		changeYtd: getCumulativeChangeOfPeriod('ytd', i.name)
	}))

	return {
		pctChanges,
		performanceTimeSeries,
		areaChartLegend: coinInfo.filter((i) => !['Bitcoin', 'Ethereum', 'Solana'].includes(i.name)).map((i) => i.name),
		isCoinPage: true,
		categoryName: (await getCategoryInfo()).find((i) => i.id === categoryId).name
	}
}
