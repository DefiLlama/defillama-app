import { getPercentChange, getPrevPeggedTotalFromChart, standardizeProtocolName } from '~/utils'
import type { IChainData } from '~/api/types'
import {
	CHART_API,
	CONFIG_API,
	PEGGEDCHART_API,
	PEGGEDCONFIG_API,
	PEGGEDDOMINANCE_API,
	PEGGEDPRICES_API,
	PEGGEDRATES_API,
	PEGGEDS_API,
	PEGGED_API
} from '~/constants'
import { formatPeggedAssetsData, formatPeggedChainsData } from './utils'

export const getPeggedAssets = () =>
	fetch(PEGGEDS_API + '?includeChains=true' + '&includePrices=true')
		.then((r) => r.json())
		.then(({ peggedAssets, chains }) => ({
			protocolsDict: peggedAssets.reduce((acc, curr) => {
				acc[standardizeProtocolName(curr.name)] = curr
				return acc
			}, {}),
			peggedAssets,
			chains
		}))

export const getPeggedPrices = () => fetch(PEGGEDPRICES_API).then((r) => r.json())

export const getPeggedRates = () => fetch(PEGGEDRATES_API).then((r) => r.json())

export const getPeggedBridgeInfo = () =>
	fetch('https://llama-stablecoins-data.s3.eu-central-1.amazonaws.com/bridgeInfo.json').then((r) => r.json())

const getChainTVLData = async (chain: string, chainCoingeckoIds) => {
	if (chain) {
		if (chainCoingeckoIds[chain]) {
			for (let i = 0; i < 5; i++) {
				try {
					return await fetch(`${CHART_API}/${chain}`).then((resp) => resp.json())
				} catch (e) {}
			}
			throw new Error(`${CHART_API}/${chain} is broken`)
		} else return null
	} else return await fetch(CHART_API).then((resp) => resp.json())
}

export async function getPeggedOverviewPageData(chain) {
	const { peggedAssets, chains } = await getPeggedAssets()
	const { chainCoingeckoIds } = await fetch(CONFIG_API).then((r) => r.json())

	const priceData = await getPeggedPrices()
	const rateData = await getPeggedRates()
	const allChartsStartTimestamp = 1617148800	// for /stablecoins page, charts begin on April 1, 2021, to reduce size of page

	let chartDataByPeggedAsset = []
	let peggedAssetNames: string[] = [] // fix name of this variable
	let peggedNameToChartDataIndex: object = {}
	chartDataByPeggedAsset = await Promise.all(
		peggedAssets.map(async (elem, i) => {
			if (peggedAssetNames.includes(elem.symbol)) {
				peggedAssetNames.push(`${elem.name}`)
			} else {
				peggedAssetNames.push(elem.symbol)
			}
			peggedNameToChartDataIndex[elem.name] = i
			for (let i = 0; i < 5; i++) {
				try {
					let charts = []
					if (!chain) {
						charts = await fetch(`${PEGGEDCHART_API}/all?stablecoin=${elem.id}&startts=${allChartsStartTimestamp}`).then((resp) => resp.json())
					} else {
						charts = await fetch(`${PEGGEDCHART_API}/${chain}?stablecoin=${elem.id}`).then((resp) => resp.json())
					}
					const formattedCharts = charts.map((chart) => {
						return {
							date: chart.date,
							mcap: chart.totalCirculatingUSD
						}
					})
					return formattedCharts
				} catch (e) {}
			}
			throw new Error(`${CHART_API}/${elem} is broken`)
		})
	)

	const chainList = await chains
		.sort((a, b) => {
			const bTotalCirculatings = Object.values(b.totalCirculatingUSD) as any
			const bMcap = bTotalCirculatings.reduce((c, d) => c + d)
			const aTotalCirculatings = Object.values(a.totalCirculatingUSD) as any
			const aMcap = aTotalCirculatings.reduce((c, d) => c + d)
			return bMcap - aMcap
		})
		.map((chain) => chain.name)
	const chainsSet = new Set()

	peggedAssets.forEach(({ chains }) => {
		chains.forEach((chain) => {
			if (!chain) {
				chainsSet.add(chain)
			} else {
				if (chainList.includes(chain)) {
					chainsSet.add(chain)
				}
			}
		})
	})

	const chainTVLData: IChainData[] = await getChainTVLData(chain, chainCoingeckoIds)

	const filteredPeggedAssets = formatPeggedAssetsData({
		peggedAssets,
		chartDataByPeggedAsset,
		priceData,
		rateData,
		peggedNameToChartDataIndex,
		chain
	})

	return {
		chains: chainList.filter((chain) => chainsSet.has(chain)),
		filteredPeggedAssets,
		peggedAssetNames,
		peggedNameToChartDataIndex,
		chartDataByPeggedAsset,
		chainTVLData,
		chain: chain ?? 'All'
	}
}

export async function getPeggedChainsPageData() {
	const { peggedAssets, chains } = await getPeggedAssets()
	const { chainCoingeckoIds } = await fetch(CONFIG_API).then((r) => r.json())

	const chartData = await fetch(`${PEGGEDCHART_API}/all`).then((r) => r.json())

	const chainList = await chains
		.sort((a, b) => {
			const bTotalCirculatings = Object.values(b.totalCirculatingUSD) as any
			const bMcap = bTotalCirculatings.reduce((c, d) => c + d)
			const aTotalCirculatings = Object.values(a.totalCirculatingUSD) as any
			const aMcap = aTotalCirculatings.reduce((c, d) => c + d)
			return bMcap - aMcap
		})
		.map((chain) => chain.name)
	const chainsSet = new Set()

	const chainsTVLData: IChainData[] = await Promise.all(
		chainList.map(async (elem: string) => {
			if (chainCoingeckoIds[elem]) {
				for (let i = 0; i < 5; i++) {
					try {
						return await fetch(`${CHART_API}/${elem}`).then((resp) => resp.json())
					} catch (e) {}
				}
				throw new Error(`${CHART_API}/${elem} is broken`)
			} else return null
		})
	)

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

	peggedAssets.forEach(({ chains }) => {
		chains.forEach((chain) => {
			if (!chain) {
				chainsSet.add(chain)
			} else {
				if (chainList.includes(chain)) {
					chainsSet.add(chain)
				}
			}
		})
	})

	let peggedChartDataByChain = []
	peggedChartDataByChain = await Promise.all(
		chainList.map(async (chain) => {
			for (let i = 0; i < 5; i++) {
				try {
					return await fetch(`${PEGGEDCHART_API}/${chain}?startts=1652241600`).then((resp) => resp.json())
				} catch (e) {}
			}
			throw new Error(`${PEGGEDCHART_API}/${chain} is broken`)
		})
	)

	let peggedDomDataByChain = []
	peggedDomDataByChain = await Promise.all(
		chainList.map(async (chain) => {
			for (let i = 0; i < 5; i++) {
				try {
					const res = await fetch(`${PEGGEDDOMINANCE_API}/${chain}`).then((resp) => resp.json())
					return res
				} catch (e) {}
			}
			throw new Error(`${PEGGEDDOMINANCE_API}/${chain} is broken`)
		})
	)

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

	const chainTVLData: IChainData[] = await getChainTVLData(undefined, undefined)

	return {
		chainCirculatings,
		chartData,
		peggedChartDataByChain,
		chainList,
		chainsGroupbyParent,
		chainTVLData
	}
}

export const getPeggedAssetPageData = async (peggedasset: string) => {
	const peggedNameToPeggedIDMapping = await fetch(PEGGEDCONFIG_API).then((resp) => resp.json())
	const peggedID = peggedNameToPeggedIDMapping[peggedasset]
	const [res, { chainCoingeckoIds }] = await Promise.all(
		[`${PEGGED_API}/${peggedID}`, CONFIG_API].map((apiEndpoint) => fetch(apiEndpoint).then((r) => r.json()))
	)

	const peggedChart = await fetch(`${PEGGEDCHART_API}/all?stablecoin=${peggedID}`).then((resp) => resp.json())
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
			bridgeInfo,
		}
	}
}
