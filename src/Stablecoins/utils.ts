import { keepNeededProperties } from '~/api/shared'
import { formattedNum, getPercentChange } from '~/utils'

export const getPrevStablecoinTotalFromChart = (chart, daysBefore, issuanceType, pegType = '') => {
	if (!chart) return null
	const prevChart = chart[chart.length - 1 - daysBefore]
	if (!prevChart) return null
	if (!pegType) return Object.values(prevChart?.[issuanceType] ?? {}).reduce((a: number, b: number) => a + b, 0)
	return prevChart?.[issuanceType]?.[pegType] ?? null
}

export const getStablecoinDominance = (topToken, totalMcap) => {
	if (topToken && totalMcap) {
		const dominance = topToken.mcap && totalMcap && (topToken.mcap / totalMcap) * 100.0
		if (!dominance) return null
		if (dominance < 100) {
			return dominance.toFixed(2)
		} else return 100
	} else return null
}

export const buildStablecoinChartData = ({
	chartDataByAssetOrChain,
	assetsOrChainsList,
	filteredIndexes,
	issuanceType = 'mcap',
	selectedChain,
	totalChartTooltipLabel = 'Mcap',
	doublecountedIds = []
}: {
	chartDataByAssetOrChain: Array<any>
	assetsOrChainsList: Array<string>
	filteredIndexes?: Array<number>
	issuanceType?: string
	selectedChain?: string | null
	totalChartTooltipLabel?: string
	doublecountedIds?: Array<number>
}) => {
	if (selectedChain === null) return {}
	const backfilledChains = [
		'All',
		'Ethereum',
		'BSC',
		'Avalanche',
		'Arbitrum',
		'Optimism',
		'Fantom',
		'Polygon',
		'Gnosis',
		'Celo',
		'Harmony',
		'Moonriver',
		'Aztec',
		'Loopring',
		'Starknet',
		'ZKsync',
		'Boba',
		'Metis',
		'Moonbeam',
		'Syscoin',
		'OKExChain',
		'IoTeX',
		'Heco'
	]
	let unformattedAreaData = {}
	let unformattedTotalData = {}
	let stackedDatasetObject = {}
	let unformattedTokenInflowData = {}
	let assetAddedToInflows = assetsOrChainsList?.reduce((acc, curr) => ({ ...acc, [curr]: false }), {}) ?? {}

	chartDataByAssetOrChain?.forEach((charts, i) => {
		if (!charts || !charts.length || !filteredIndexes.includes(i) || doublecountedIds.includes(i)) return
		charts.forEach((chart, j) => {
			const mcap = getPrevStablecoinTotalFromChart([chart], 0, issuanceType) // 'issuanceType' and 'mcap' here are 'circulating' values on /stablecoin pages, and 'mcap' otherwise
			const prevDayMcap = getPrevStablecoinTotalFromChart([charts[j - 1]], 0, issuanceType)
			const assetOrChain = assetsOrChainsList[i]
			const date = chart.date
			if (date > 1596248105 && mcap) {
				if (backfilledChains.includes(selectedChain) || date > 1652241600) {
					// for individual chains data is currently only backfilled to May 11, 2022
					unformattedAreaData[date] = unformattedAreaData[date] || {}
					unformattedAreaData[date][assetsOrChainsList[i]] = mcap

					unformattedTotalData[date] = (unformattedTotalData[date] ?? 0) + mcap

					if (mcap !== null && mcap !== 0) {
						if (stackedDatasetObject[date] == undefined) {
							stackedDatasetObject[date] = {}
						}
						const b = stackedDatasetObject[date][assetOrChain]
						stackedDatasetObject[date][assetOrChain] = { ...b, circulating: mcap ?? 0 }
					}

					const diff = (mcap ?? 0) - (prevDayMcap ?? 0)
					// the first day's inflow is not added to prevent large inflows on the day token is first tracked
					if (assetAddedToInflows[assetOrChain]) {
						unformattedTokenInflowData[date] = unformattedTokenInflowData[date] || {}
						unformattedTokenInflowData[date][assetsOrChainsList[i]] = diff
					}
					if (diff) {
						assetAddedToInflows[assetOrChain] = true
					}
				}
			}
		})
	})

	const peggedAreaChartData = Object.entries(unformattedAreaData).map(([date, chart]) => {
		if (typeof chart === 'object') {
			return {
				date: date,
				...chart
			}
		}
	})

	const peggedAreaTotalData = Object.entries(unformattedTotalData).map(([date, mcap]) => {
		return {
			date: date,
			[totalChartTooltipLabel]: mcap
		}
	})

	const stackedDataset = Object.entries(stackedDatasetObject)

	const secondsInDay = 3600 * 24
	let zeroTokenInflows = 0
	let zeroUsdInfows = 0
	let tokenInflows = []
	let usdInflows = []
	const tokenSet: Set<string> = new Set()
	Object.entries(unformattedTokenInflowData).map(([date, chart]) => {
		if (typeof chart === 'object') {
			let dayDifference = 0
			let tokenDayDifference = {}
			for (const token in chart) {
				tokenSet.add(token)
				const diff = chart[token]
				if (!Number.isNaN(diff)) {
					// Here, the inflow tokens could be restricted to top daily top tokens, but they aren't. Couldn't find good UX doing so.
					tokenDayDifference[token] = diff
					dayDifference += diff
				}
			}

			if (dayDifference === 0) {
				zeroUsdInfows++
			}

			if (Object.keys(tokenDayDifference)?.length === 0) {
				zeroTokenInflows++
			}

			// the dates on the inflows are all off by 1 (because timestamps are at 00:00), so they are moved back 1 day
			const adjustedDate = (parseInt(date) - secondsInDay).toString()

			tokenInflows.push({
				...tokenDayDifference,
				date: adjustedDate
			})

			usdInflows.push([adjustedDate, dayDifference])
		}
	})

	const tokenInflowNames = zeroTokenInflows === tokenInflows.length ? ['USDT'] : (Array.from(tokenSet) as any)

	tokenInflows = zeroTokenInflows === tokenInflows.length ? [{ USDT: 0, date: '1652486400' }] : tokenInflows
	usdInflows = zeroUsdInfows === usdInflows.length ? [['1652486400', 0]] : usdInflows

	return { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows }
}

export const peggedPropertiesToKeep = [
	'circulating',
	'minted',
	'unreleased',
	'mcap',
	'name',
	'symbol',
	'gecko_id',
	'chains',
	'price',
	'pegType',
	'pegMechanism',
	'change_1d',
	'change_7d',
	'change_1m',
	'change_1d_nol',
	'change_7d_nol',
	'change_1m_nol',
	'pegDeviation',
	'pegDeviation_1m',
	'pegDeviationInfo',
	'circulatingPrevDay',
	'circulatingPrevWeek',
	'circulatingPrevMonth',
	'delisted'
]

const getTargetPrice = (pegType: string, ratesChart: any, daysBefore: number) => {
	const currencyTicker = pegType.slice(-3)
	if (currencyTicker === 'USD') {
		return 1
	}
	const rates = ratesChart?.[ratesChart.length - 1 - daysBefore] ?? null
	const rate = rates?.rates?.[currencyTicker]
	return 1 / parseFloat(rate)
}

export const formatPeggedAssetsData = ({
	chain = '',
	peggedAssets = [],
	chartDataByPeggedAsset = [],
	priceData = [],
	rateData = [],
	peggedNameToChartDataIndex = {},
	peggedAssetProps = [...peggedPropertiesToKeep]
}) => {
	let filteredPeggedAssets = [...peggedAssets]

	if (chain) {
		filteredPeggedAssets = filteredPeggedAssets.filter(({ chains = [] }) => chains.includes(chain))
	}

	filteredPeggedAssets = filteredPeggedAssets.map((pegged) => {
		const pegType = pegged.pegType
		const peggedGeckoID = pegged.gecko_id
		const price = pegged.price
		const priceSource = pegged.priceSource ?? null
		if (chain) {
			const chainCirculating = pegged.chainCirculating[chain]
			pegged.circulating = chainCirculating ? chainCirculating.current[pegType] ?? 0 : 0
			pegged.circulatingPrevDay = chainCirculating ? chainCirculating.circulatingPrevDay[pegType] ?? null : null
			pegged.circulatingPrevWeek = chainCirculating ? chainCirculating.circulatingPrevWeek[pegType] ?? null : null
			pegged.circulatingPrevMonth = chainCirculating ? chainCirculating.circulatingPrevMonth[pegType] ?? null : null
		} else {
			pegged.circulating = pegged.circulating?.[pegType] ?? 0
			pegged.circulatingPrevDay = pegged.circulatingPrevDay?.[pegType] ?? null
			pegged.circulatingPrevWeek = pegged.circulatingPrevWeek?.[pegType] ?? null
			pegged.circulatingPrevMonth = pegged.circulatingPrevMonth?.[pegType] ?? null
		}
		const chartIndex = peggedNameToChartDataIndex[pegged.name]
		const chart = chartDataByPeggedAsset[chartIndex] ?? null

		pegged.mcap = getPrevStablecoinTotalFromChart(chart, 0, 'mcap') ?? null
		const mcapPrevDay = getPrevStablecoinTotalFromChart(chart, 1, 'mcap') ?? null
		const mcapPrevWeek = getPrevStablecoinTotalFromChart(chart, 7, 'mcap') ?? null
		const mcapPrevMonth = getPrevStablecoinTotalFromChart(chart, 30, 'mcap') ?? null
		pegged.change_1d = getPercentChange(pegged.mcap, mcapPrevDay)
		pegged.change_7d = getPercentChange(pegged.mcap, mcapPrevWeek)
		pegged.change_1m = getPercentChange(pegged.mcap, mcapPrevMonth)

		const change_1d_nol =
			pegged.mcap && mcapPrevDay
				? formattedNum(String(parseFloat(pegged.mcap as string) - parseFloat(mcapPrevDay as string)), true)
				: null
		const change_7d_nol =
			pegged.mcap && mcapPrevWeek
				? formattedNum(String(parseFloat(pegged.mcap as string) - parseFloat(mcapPrevWeek as string)), true)
				: null
		const change_1m_nol =
			pegged.mcap && mcapPrevMonth
				? formattedNum(String(parseFloat(pegged.mcap as string) - parseFloat(mcapPrevMonth as string)), true)
				: null

		pegged.change_1d_nol = !change_1d_nol ? null : change_1d_nol.startsWith('-') ? change_1d_nol : `+${change_1d_nol}`
		pegged.change_7d_nol = !change_7d_nol ? null : change_7d_nol.startsWith('-') ? change_7d_nol : `+${change_7d_nol}`
		pegged.change_1m_nol = !change_1m_nol ? null : change_1m_nol.startsWith('-') ? change_1m_nol : `+${change_1m_nol}`

		if (pegType !== 'peggedVAR' && price) {
			let targetPrice = getTargetPrice(pegType, rateData, 0)
			pegged.pegDeviation = getPercentChange(price, targetPrice)
			let greatestDeviation = 0
			for (let i = 0; i < 30; i++) {
				let historicalPrices = priceData[priceData.length - i - 1]
				let historicalTargetPrice = getTargetPrice(pegType, rateData, i)
				let historicalPrice = parseFloat(historicalPrices?.prices?.[peggedGeckoID])
				if (historicalPrice && historicalTargetPrice) {
					let timestamp = historicalPrices?.date
					let deviation = historicalPrice - historicalTargetPrice
					if (Math.abs(greatestDeviation) < Math.abs(deviation)) {
						greatestDeviation = deviation
						if (0.02 < Math.abs(greatestDeviation)) {
							pegged.pegDeviationInfo = {
								timestamp: timestamp,
								price: historicalPrice,
								priceSource: priceSource
							}
						}
					}
				}
			}
			if (Math.abs(greatestDeviation) < Math.abs(price - targetPrice)) {
				greatestDeviation = price - targetPrice
				if (0.02 < Math.abs(greatestDeviation)) {
					pegged.pegDeviationInfo = {
						timestamp: Date.now() / 1000,
						price: price,
						priceSource: priceSource
					}
				}
			}
			pegged.pegDeviation_1m = getPercentChange(targetPrice + greatestDeviation, targetPrice)
		}
		return keepNeededProperties(pegged, peggedAssetProps)
	})

	if (chain) {
		filteredPeggedAssets = filteredPeggedAssets.sort((a, b) => b.mcap - a.mcap)
	}

	return filteredPeggedAssets
}

export const formatPeggedChainsData = ({
	chainList = [],
	peggedChartDataByChain = [],
	chainDominances = {},
	chainsTVLData = []
}) => {
	let filteredPeggedAssets = peggedChartDataByChain.map((chart, i) => {
		let chainData = {} as any
		const chainName = chainList[i]
		const chainDominance = chainDominances[chainName] ?? null

		const latestChainTVL = chainsTVLData?.[i] ?? null

		chainData.name = chainName
		chainData.circulating = getPrevStablecoinTotalFromChart(chart, 0, 'totalCirculating')
		chainData.mcap = getPrevStablecoinTotalFromChart(chart, 0, 'totalCirculatingUSD')
		chainData.unreleased = getPrevStablecoinTotalFromChart(chart, 0, 'totalUnreleased')
		chainData.bridgedTo = getPrevStablecoinTotalFromChart(chart, 0, 'totalBridgedToUSD')
		chainData.minted = getPrevStablecoinTotalFromChart(chart, 0, 'totalMintedUSD')
		chainData.mcapPrevDay = getPrevStablecoinTotalFromChart(chart, 1, 'totalCirculatingUSD')
		chainData.mcapPrevWeek = getPrevStablecoinTotalFromChart(chart, 7, 'totalCirculatingUSD')
		chainData.mcapPrevMonth = getPrevStablecoinTotalFromChart(chart, 30, 'totalCirculatingUSD')

		chainData.change_1d = getPercentChange(chainData.mcap, chainData.mcapPrevDay)
		chainData.change_7d = getPercentChange(chainData.mcap, chainData.mcapPrevWeek)
		chainData.change_1m = getPercentChange(chainData.mcap, chainData.mcapPrevMonth)

		chainData.dominance = chainDominance
			? {
					name: chainDominance.symbol,
					value: getStablecoinDominance(chainDominance, chainData.mcap)
			  }
			: null

		chainData.mcaptvl = (chainData.mcap && latestChainTVL && chainData.mcap / latestChainTVL) ?? null
		if (chainData.mcaptvl == 0) {
			chainData.mcaptvl = null
		}

		return chainData
	})

	filteredPeggedAssets = filteredPeggedAssets.sort((a, b) => b.mcap - a.mcap)

	return filteredPeggedAssets
}
