import { getPercentChange, getPrevPeggedTotalFromChart, standardizeProtocolName } from '~/utils'
import {
	CONFIG_API,
	PEGGEDCHART_API,
	PEGGEDCONFIG_API,
	PEGGEDPRICES_API,
	PEGGEDRATES_API,
	PEGGEDS_API,
	PEGGED_API,
	PEGGEDCHART_DOMINANCE_ALL_API,
	PEGGEDCHART_COINS_RECENT_DATA_API,
} from '~/constants'
import { formatPeggedAssetsData, formatPeggedChainsData } from './utils'
import { wrappedFetch } from '~/utils/async'

export const getPeggedAssets = () =>
	wrappedFetch(PEGGEDS_API, { cache: true })
		.then(({ peggedAssets, chains }) => ({
			protocolsDict: peggedAssets.reduce((acc, curr) => {
				acc[standardizeProtocolName(curr.name)] = curr
				return acc
			}, {}),
			peggedAssets,
			chains
		}))

export const getPeggedPrices = () => wrappedFetch(PEGGEDPRICES_API, { cache: true })
export const getPeggedRates = () => wrappedFetch(PEGGEDRATES_API, { cache: true })
export const getConfigData = () => wrappedFetch(CONFIG_API, { cache: true })

export const getPeggedBridgeInfo = () =>
	wrappedFetch('https://llama-stablecoins-data.s3.eu-central-1.amazonaws.com/bridgeInfo.json', { cache: true })

let globalData: any

function fetchGlobalData({ peggedAssets, chains }: any) {
	if (globalData) return globalData
	const tvlMap: any = {}
	chains.forEach((chain) => {
		tvlMap[chain.name] = chain.tvl
	})
	const chainList = chains
		.sort((a, b) => {
			const bTotalCirculatings = Object.values(b.totalCirculatingUSD) as any
			const bMcap = bTotalCirculatings.reduce((c, d) => c + d)
			const aTotalCirculatings = Object.values(a.totalCirculatingUSD) as any
			const aMcap = aTotalCirculatings.reduce((c, d) => c + d)
			return bMcap - aMcap
		})
		.map((chain) => chain.name)
	const chainsSet = new Set()
	const _chainSet = new Set(chainList)
	peggedAssets.forEach(({ chains }) => {
		chains.forEach((chain) => {
			if (!chain) {
				chainsSet.add(chain)
			} else {
				if (_chainSet.has(chain))
					chainsSet.add(chain)
			}
		})
	})
	globalData = {
		chainList,
		chainsSet,
		_chains: chainList.filter((chain) => chainsSet.has(chain)),
		chainsTVLData: chainList.map((chain) => tvlMap[chain])
	}

	return globalData
}

export async function getPeggedOverviewPageData(chain) {
	const { peggedAssets, chains } = await getPeggedAssets()
	const chainLabel = chain ?? 'all-llama-app' // custom key to fetch limited data to reduce page size
	const { breakdown } = await wrappedFetch(`${PEGGEDCHART_API}/${chainLabel}`)

	const priceData = await getPeggedPrices()
	const rateData = await getPeggedRates()

	let chartDataByPeggedAsset = []
	let peggedAssetNamesSet: Set<string> = new Set() // fix name of this variable

	let peggedNameToChartDataIndex: object = {}
	let lastTimestamp = 0
	chartDataByPeggedAsset = peggedAssets.map((elem, i) => {
		if (peggedAssetNamesSet.has(elem.symbol))
			peggedAssetNamesSet.add(`${elem.name}`)
		else
			peggedAssetNamesSet.add(elem.symbol)

		peggedNameToChartDataIndex[elem.name] = i
		let charts = breakdown[elem.id] ?? []
		const formattedCharts = charts.map((chart) => {
			return {
				date: chart.date,
				mcap: chart.totalCirculatingUSD
			}
		}).filter(i => i.mcap !== undefined)
		if (formattedCharts.length > 0) {
			lastTimestamp = Math.max(lastTimestamp, formattedCharts[formattedCharts.length - 1].date)
		}
		return formattedCharts
	})
	chartDataByPeggedAsset.forEach((chart) => {
		const last = chart[chart.length - 1]
		if (!last) {
			return
		}
		let lastDate = Number(last.date)
		while (lastDate < lastTimestamp) {
			lastDate += 24 * 3600
			chart.push({
				...last,
				date: lastDate
			})
		}
	})

	const filteredPeggedAssets = formatPeggedAssetsData({
		peggedAssets,
		chartDataByPeggedAsset,
		priceData,
		rateData,
		peggedNameToChartDataIndex,
		chain
	})

	return {
		chains: fetchGlobalData({ peggedAssets, chains })._chains,
		filteredPeggedAssets,
		peggedAssetNames: [...peggedAssetNamesSet],
		peggedNameToChartDataIndex,
		chartDataByPeggedAsset,
		chain: chain ?? 'All'
	}
}

export async function getPeggedChainsPageData() {
	const { peggedAssets, chains } = await getPeggedAssets()
	const { chainCoingeckoIds } = await getConfigData()

	const { aggregated: chartData } = await wrappedFetch(`${PEGGEDCHART_API}/all`)
	const { dominanceMap, chainChartMap, } = await wrappedFetch(PEGGEDCHART_DOMINANCE_ALL_API)
	const { chainList, chainsTVLData } = fetchGlobalData({ peggedAssets, chains })

	let chainsGroupbyParent = {}
	chainList.forEach((chain) => {
		const parent = chainCoingeckoIds[chain]?.parent
		if (parent) {
			if (!chainsGroupbyParent[parent.chain]) {
				chainsGroupbyParent[parent.chain] = {}
			}
			for (const type of parent.types) {
				if (!chainsGroupbyParent[parent.chain][type]) {
					chainsGroupbyParent[parent.chain][type] = []
				}
				chainsGroupbyParent[parent.chain][type].push(chain)
			}
		}
	})

	let peggedChartDataByChain = chainList.map((chain) => chainChartMap[chain])

	let peggedDomDataByChain = chainList.map((chain) => dominanceMap[chain])

	let chainDominances = {}
	peggedDomDataByChain.map((charts, i) => {
		const lastChart = charts[charts.length - 1]
		if (!lastChart) return
		const greatestChainMcap = lastChart.greatestMcap
		const chainName = chainList[i]
		chainDominances[chainName] = greatestChainMcap
	})

	const chainCirculatings = formatPeggedChainsData({
		chainList,
		peggedChartDataByChain,
		chainDominances,
		chainsTVLData
	})

	peggedChartDataByChain = peggedChartDataByChain.map((charts) => {
		const formattedCharts = charts.map((chart) => {
			return {
				date: chart.date,
				mcap: chart.totalCirculatingUSD
			}
		})
		return formattedCharts
	})


	return {
		chainCirculatings,
		chartData,
		peggedChartDataByChain,
		chainList,
		chainsGroupbyParent,
	}
}

export const getPeggedAssetPageData = async (peggedasset: string) => {
	const peggedNameToPeggedIDMapping = await wrappedFetch(PEGGEDCONFIG_API, { cache: true })
	const peggedID = peggedNameToPeggedIDMapping[peggedasset]
	const [res, { chainCoingeckoIds }, recentCoinsData] = await Promise.all([
		wrappedFetch(`${PEGGED_API}/${peggedID}`),
		getConfigData(),
		wrappedFetch(PEGGEDCHART_COINS_RECENT_DATA_API, { cache: true }),
	])

	const peggedChart = recentCoinsData[peggedID]
	const bridgeInfo = await getPeggedBridgeInfo()

	const pegType = res.pegType

	const totalCirculating = getPrevPeggedTotalFromChart(peggedChart, 0, 'totalCirculating', pegType)
	const unreleased = getPrevPeggedTotalFromChart(peggedChart, 0, 'totalUnreleased', pegType)
	const mcap = getPrevPeggedTotalFromChart(peggedChart, 0, 'totalCirculatingUSD', pegType)

	const chainsUnique: string[] = Object.keys(res.chainBalances)

	const chainsData: any[] = await Promise.all(
		chainsUnique.map(async (elem: string) => {
			return res.chainBalances[elem].tokens
		})
	)

	const chainCirculatings = chainsUnique
		.map((chainName, i) => {
			const circulating: number = getPrevPeggedTotalFromChart(chainsData[i], 0, 'circulating', pegType)
			const unreleased: number = getPrevPeggedTotalFromChart(chainsData[i], 0, 'unreleased', pegType)
			let bridgedTo: number = getPrevPeggedTotalFromChart(chainsData[i], 0, 'bridgedTo', pegType)
			const bridges: any = getPrevPeggedTotalFromChart(chainsData[i], 0, 'bridgedTo', 'bridges')
			const circulatingPrevDay: number = getPrevPeggedTotalFromChart(chainsData[i], 1, 'circulating', pegType)
			const circulatingPrevWeek: number = getPrevPeggedTotalFromChart(chainsData[i], 7, 'circulating', pegType)
			const circulatingPrevMonth: number = getPrevPeggedTotalFromChart(chainsData[i], 30, 'circulating', pegType)
			const change_1d = getPercentChange(circulating, circulatingPrevDay)
			const change_7d = getPercentChange(circulating, circulatingPrevWeek)
			const change_1m = getPercentChange(circulating, circulatingPrevMonth)

			return {
				circulating,
				unreleased,
				change_1d,
				change_7d,
				change_1m,
				circulatingPrevDay,
				circulatingPrevWeek,
				circulatingPrevMonth,
				bridgedAmount: bridgedTo,
				bridges,
				name: chainName,
				symbol: chainCoingeckoIds[chainName]?.symbol ?? '-'
			}
		})
		.sort((a, b) => b.circulating - a.circulating)

	return {
		props: {
			chainsUnique,
			chainCirculatings,
			peggedAssetData: res,
			totalCirculating,
			unreleased,
			mcap,
			bridgeInfo
		}
	}
}
