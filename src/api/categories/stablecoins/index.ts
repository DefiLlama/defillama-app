import { getPercentChange, getPrevPeggedTotalFromChart, standardizeProtocolName } from '~/utils'
import type { IChainData, IStackedDataset } from '~/api/types'
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

export async function getPeggedOverviewPageData(chain) {
	const { peggedAssets, chains } = await getPeggedAssets()

	const chartData = await fetch(PEGGEDCHART_API + (chain ? '/' + chain : '/all')).then((r) => r.json())
	const priceData = await getPeggedPrices()
	const rateData = await getPeggedRates()

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
						charts = await fetch(`${PEGGEDCHART_API}/all?stablecoin=${elem.id}`).then((resp) => resp.json())
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
		chartData,
		chartDataByPeggedAsset,
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

	const chainsData: IChainData[] = await Promise.all(
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
					const charts = await fetch(`${PEGGEDCHART_API}/${chain}`).then((resp) => resp.json())
					const formattedCharts = charts.map((chart) => {
						return {
							date: chart.date,
							totalCirculating: chart.totalCirculating,
							totalUnreleased: chart.totalUnreleased,
							mcap: chart.totalCirculatingUSD,
							totalMintedUSD: chart.totalMintedUSD,
							totalBridgedToUSD: chart.totalBridgedToUSD,
						}
					})
					return formattedCharts
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
		chainsData
	})

	return {
		chainCirculatings,
		chartData,
		peggedChartDataByChain,
		chainList,
		chainsGroupbyParent
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

	const stackedDataset = Object.entries(
		chainsData.reduce((total: IStackedDataset, chains, i) => {
			const chainName = chainsUnique[i]
			chains.forEach((circulating) => {
				const date = circulating.date
				if (date < 1652932800) return // data on all chains for an asset is on only backfilled to May 20, 2022
				if (total[date] === undefined) {
					total[date] = {}
				}
				const b = total[date][chainName]
				total[date][chainName] = {
					...b,
					circulating: circulating.circulating ? circulating.circulating[pegType] ?? 0 : 0,
					unreleased: circulating.unreleased ? circulating.unreleased[pegType] ?? 0 : 0
				}
			})
			return total
		}, {})
	)

	const peggedChartType = 'Dominance'

	return {
		props: {
			chainsUnique,
			chainCirculatings,
			stackedDataset,
			peggedAssetData: res,
			totalCirculating,
			unreleased,
			mcap,
			bridgeInfo,
			peggedChartType
		}
	}
}
