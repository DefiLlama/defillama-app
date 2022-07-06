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
	'change_1d',
	'change_7d',
	'change_1m',
	'circulatingPrevDay',
	'circulatingPrevWeek',
	'circulatingPrevMonth'
]

export const formatPeggedAssetsData = ({
	chain = '',
	peggedAssets = [],
	chartDataByPeggedAsset = [],
	peggedNameToIndexObj = {},
	peggedAssetProps = [...peggedPropertiesToKeep]
}) => {
	let filteredPeggedAssets = [...peggedAssets]

	if (chain) {
		filteredPeggedAssets = filteredPeggedAssets.filter(({ chains = [] }) => chains.includes(chain))
	}

	filteredPeggedAssets = filteredPeggedAssets.map((pegged) => {
		let pegType = pegged.pegType
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
		const chartIndex = peggedNameToIndexObj[pegged.name]
		const chart = chartDataByPeggedAsset[chartIndex] ?? null

		pegged.mcap = getPrevPeggedTotalFromChart(chart, 0, 'totalCirculatingUSD') ?? null
		const mcapPrevDay = getPrevPeggedTotalFromChart(chart, 1, 'totalCirculatingUSD') ?? null
		const mcapPrevWeek = getPrevPeggedTotalFromChart(chart, 7, 'totalCirculatingUSD') ?? null
		const mcapPrevMonth = getPrevPeggedTotalFromChart(chart, 30, 'totalCirculatingUSD') ?? null
		pegged.change_1d = getPercentChange(pegged.mcap, mcapPrevDay)
		pegged.change_7d = getPercentChange(pegged.mcap, mcapPrevWeek)
		pegged.change_1m = getPercentChange(pegged.mcap, mcapPrevMonth)

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
	chainsData = []
}) => {
	let filteredPeggedAssets = peggedChartDataByChain.map((chart, i) => {
		let chainData = {} as any
		const chainName = chainList[i]
		const chainDominance = chainDominances[chainName] ?? null

		const currentTimestamp = Date.now() / 1000
		const secondsInMonth = 2592000
		const latestChainTVLCharts = chainsData?.[i]?.tvl ?? null
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
