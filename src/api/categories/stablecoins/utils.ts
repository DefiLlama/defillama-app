import { getPeggedDominance, getPercentChange, getPrevPeggedTotalFromChart } from '~/utils'
import { keepNeededProperties } from '../../shared'

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
		const priceSource = pegged.priceSource
		if (chain) {
			const chainCirculating = pegged.chainCirculating[chain]
			pegged.circulating = chainCirculating ? chainCirculating.current[pegType] ?? 0 : 0
			pegged.circulatingPrevDay = chainCirculating ? chainCirculating.circulatingPrevDay[pegType] ?? null : null
			pegged.circulatingPrevWeek = chainCirculating ? chainCirculating.circulatingPrevWeek[pegType] ?? null : null
			pegged.circulatingPrevMonth = chainCirculating ? chainCirculating.circulatingPrevMonth[pegType] ?? null : null
		} else {
			pegged.circulating = pegged.circulating[pegType] ?? 0
			pegged.circulatingPrevDay = pegged.circulatingPrevDay[pegType] ?? null
			pegged.circulatingPrevWeek = pegged.circulatingPrevWeek[pegType] ?? null
			pegged.circulatingPrevMonth = pegged.circulatingPrevMonth[pegType] ?? null
		}
		const chartIndex = peggedNameToChartDataIndex[pegged.name]
		const chart = chartDataByPeggedAsset[chartIndex] ?? null

		pegged.mcap = getPrevPeggedTotalFromChart(chart, 0, 'mcap') ?? null
		const mcapPrevDay = getPrevPeggedTotalFromChart(chart, 1, 'mcap') ?? null
		const mcapPrevWeek = getPrevPeggedTotalFromChart(chart, 7, 'mcap') ?? null
		const mcapPrevMonth = getPrevPeggedTotalFromChart(chart, 30, 'mcap') ?? null
		pegged.change_1d = getPercentChange(pegged.mcap, mcapPrevDay)
		pegged.change_7d = getPercentChange(pegged.mcap, mcapPrevWeek)
		pegged.change_1m = getPercentChange(pegged.mcap, mcapPrevMonth)

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

		const currentTimestamp = Date.now() / 1000
		const secondsInMonth = 2592000
		const latestChainTVLCharts = chainsTVLData?.[i]?.tvl ?? null
		const latestChainTVLItem = latestChainTVLCharts?.[latestChainTVLCharts.length - 1]
		const latestChainTVL =
			currentTimestamp - secondsInMonth < (latestChainTVLItem?.[0] ?? 0) ? latestChainTVLItem[1] : null

		chainData.name = chainName
		chainData.circulating = getPrevPeggedTotalFromChart(chart, 0, 'totalCirculating')
		chainData.mcap = getPrevPeggedTotalFromChart(chart, 0, 'totalCirculatingUSD')
		chainData.unreleased = getPrevPeggedTotalFromChart(chart, 0, 'totalUnreleased')
		chainData.bridgedTo = getPrevPeggedTotalFromChart(chart, 0, 'totalBridgedToUSD')
		chainData.minted = getPrevPeggedTotalFromChart(chart, 0, 'totalMintedUSD')
		chainData.mcapPrevDay = getPrevPeggedTotalFromChart(chart, 1, 'totalCirculatingUSD')
		chainData.mcapPrevWeek = getPrevPeggedTotalFromChart(chart, 7, 'totalCirculatingUSD')
		chainData.mcapPrevMonth = getPrevPeggedTotalFromChart(chart, 30, 'totalCirculatingUSD')

		chainData.change_1d = getPercentChange(chainData.mcap, chainData.mcapPrevDay)
		chainData.change_7d = getPercentChange(chainData.mcap, chainData.mcapPrevWeek)
		chainData.change_1m = getPercentChange(chainData.mcap, chainData.mcapPrevMonth)

		chainData.dominance = chainDominance
			? {
					name: chainDominance.symbol,
					value: getPeggedDominance(chainDominance, chainData.mcap)
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
