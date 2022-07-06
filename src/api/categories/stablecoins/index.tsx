import { getPercentChange, getPrevPeggedTotalFromChart, standardizeProtocolName } from '~/utils'
import type { IChainData, IStackedDataset } from '~/api/types'
import { CHART_API, CONFIG_API, PEGGEDCHART_API, PEGGEDCONFIG_API, PEGGEDS_API, PEGGED_API } from '~/constants'
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

export const getPeggedPrices = () => fetch(PEGGEDCONFIG_API).then((r) => r.json())

export const getPeggedBridgeInfo = () =>
	fetch('https://llama-stablecoins-data.s3.eu-central-1.amazonaws.com/bridgeInfo.json').then((r) => r.json())

export async function getPeggedOverviewPageData(chain) {
	const { peggedAssets, chains } = await getPeggedAssets()
	const chartData = await fetch(PEGGEDCHART_API + (chain ? '/' + chain : '')).then((r) => r.json())

	let chartDataByPeggedAsset = []
	let peggedAssetNames: string[] = [] // fix name of this variable
	let peggedNameToIndexObj: object = {}
	chartDataByPeggedAsset = await Promise.all(
		peggedAssets.map(async (elem, i) => {
			if (peggedAssetNames.includes(elem.symbol)) {
				peggedAssetNames.push(`${elem.name}`)
			} else {
				peggedAssetNames.push(elem.symbol)
			}
			peggedNameToIndexObj[elem.name] = i
			for (let i = 0; i < 5; i++) {
				try {
					if (!chain) {
						return await fetch(`${PEGGEDCHART_API}/?peggedAsset=${elem.gecko_id}`).then((resp) => resp.json())
					}
					return await fetch(`${PEGGEDCHART_API}/${chain}?peggedAsset=${elem.gecko_id}`).then((resp) => resp.json())
				} catch (e) {}
			}
			throw new Error(`${PEGGEDCHART_API}/${elem} is broken`)
		})
	)

	let peggedAreaChartData = chartDataByPeggedAsset.reduce((total, charts, i) => {
		if (!charts.length) return total
		charts.forEach((chart) => {
			if (chart.date > 1596248105 && chart.mcap) {
				if (!(chain && chart.date < 1652241600)) {
					// for individual chains data is currently only backfilled to May 11, 2022
					total[chart.date] = total[chart.date] || {}
					total[chart.date][peggedAssetNames[i]] = chart.mcap
				}
			}
		})
		return total
	}, {})

	peggedAreaChartData = Object.entries(peggedAreaChartData).map(([date, chart]) => {
		if (typeof chart === 'object') {
			return {
				date: date,
				...chart
			}
		}
	})

	let peggedMcapChartData = []
	if (chain) {
		peggedMcapChartData = await fetch(`${PEGGEDCHART_API}/${chain}`).then((resp) => resp.json())
	} else {
		peggedMcapChartData = await fetch(`${PEGGEDCHART_API}`).then((resp) => resp.json())
	}

	let peggedAreaMcapData = {}
	peggedMcapChartData.map((chart) => {
		if ((!chain && chart.date > 1596248105 && chart.mcap) || (chart.date > 1652241600 && chart.mcap)) {
			// for individual chains data is currently only backfilled to May 11, 2022
			peggedAreaMcapData[chart.date] = peggedAreaMcapData[chart.date] || {}
			peggedAreaMcapData[chart.date]['Total Stablecoins Market Cap'] = chart.mcap
		}
	})

	peggedAreaMcapData = Object.keys(peggedAreaMcapData).map((date) => {
		return {
			date: date,
			...peggedAreaMcapData[date]
		}
	})

	const stackedDataset = Object.entries(
		chartDataByPeggedAsset.reduce((total: IStackedDataset, charts, i) => {
			if (!charts.length) return total
			charts.forEach((chart) => {
				const peggedName = peggedAssetNames[i]
				const circulating = chart.mcap // should rename this variable; useCalcGroupExtraPeggedByDay accesses it
				const date = chart.date
				if (date < 1596248105) return
				if (chain && chart.date < 1652241600) return // for individual chains data is currently only backfilled to May 11, 2022
				if (circulating !== null && circulating !== 0) {
					if (total[date] == undefined) {
						total[date] = {}
					}
					const b = total[date][peggedName]
					total[date][peggedName] = { ...b, circulating: circulating ?? 0 }
				}
			})
			return total
		}, {})
	)

	const chainList = await chains.sort((a, b) => b.mcap - a.mcap).map((chain) => chain.name)
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
		peggedNameToIndexObj,
		chain
	})

	const peggedChartType = stackedDataset.length > 30 ? 'Area' : 'Pie'

	return {
		chains: chainList.filter((chain) => chainsSet.has(chain)),
		filteredPeggedAssets,
		peggedAssetNames,
		chartData,
		peggedAreaChartData,
		peggedAreaMcapData,
		stackedDataset,
		peggedChartType,
		chain: chain ?? 'All'
	}
}

export async function getPeggedChainsPageData() {
	const { peggedAssets, chains } = await getPeggedAssets()
	const { chainCoingeckoIds } = await fetch(CONFIG_API).then((r) => r.json())

	const chartData = await fetch(PEGGEDCHART_API).then((r) => r.json())

	const chainList = await chains.sort((a, b) => b.mcap - a.mcap).map((chain) => chain.name)
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
					const res = await fetch(`${PEGGEDCHART_API}/${chain}`).then((resp) => resp.json())
					return res
				} catch (e) {}
			}
			throw new Error(`${PEGGEDCHART_API}/${chain} is broken`)
		})
	)

	let peggedAreaChainData = peggedChartDataByChain.reduce((total, charts, i) => {
		if (!charts.length) return total
		charts.forEach((chart) => {
			const chainName = chainList[i]
			if (chart.date > 1652241600 && chart.mcap) {
				total[chart.date] = total[chart.date] || {}
				total[chart.date][chainName] = chart.mcap
			}
		})
		return total
	}, {})

	peggedAreaChainData = Object.entries(peggedAreaChainData).map(([date, chart]) => {
		if (typeof chart === 'object') {
			return {
				date: date,
				...chart
			}
		}
	})

	let peggedMcapChartData = []
	peggedMcapChartData = await fetch(`${PEGGEDCHART_API}`).then((resp) => resp.json())

	let peggedAreaMcapData = {}
	peggedMcapChartData.map((chart) => {
		if (chart.date > 1596248105 && chart.mcap) {
			peggedAreaMcapData[chart.date] = peggedAreaMcapData[chart.date] || {}
			peggedAreaMcapData[chart.date]['Total Stablecoins Market Cap'] = chart.mcap
		}
	})

	peggedAreaMcapData = Object.keys(peggedAreaMcapData).map((date) => {
		return {
			date: date,
			...peggedAreaMcapData[date]
		}
	})

	let chainDominances = {}
	peggedChartDataByChain.map((charts, i) => {
		const lastChart = charts[charts.length - 1]
		if (!lastChart) return
		const greatestChainMcap = lastChart.greatestChainMcap
		const chainName = chainList[i]
		chainDominances[chainName] = greatestChainMcap
	})

	const pegType = 'peggedUSD'
	const stackedDataset = Object.entries(
		peggedChartDataByChain.reduce((total: IStackedDataset, charts, i) => {
			if (!charts.length) return total
			charts.forEach((chart) => {
				const chainName = chainList[i]
				const circulating = chart.mcap // should rename this variable; useCalcGroupExtraPeggedByDay accesses it
				const date = chart.date
				if (date < 1652241600) return
				if (circulating !== null && circulating !== 0) {
					if (total[date] == undefined) {
						total[date] = {}
					}
					const b = total[date][chainName]
					total[date][chainName] = { ...b, circulating: circulating ?? 0 }
				}
			})
			return total
		}, {})
	)

	// formatPeggedChainsData includes all "pegTypes" for mcap, but only 1 pegType for other chainCirculatings props
	const chainCirculatings = formatPeggedChainsData({
		pegType,
		chainList,
		peggedChartDataByChain,
		chainDominances,
		chainsData
	})

	const peggedChartType = stackedDataset.length > 30 ? 'Area' : 'Pie'

	return {
		chainCirculatings,
		chartData,
		peggedAreaChainData,
		peggedAreaMcapData,
		stackedDataset,
		peggedChartType,
		chainList,
		chainsGroupbyParent
	}
}

export const getPeggedAssetPageData = async (category: string, peggedasset: string) => {
	const [res, { chainCoingeckoIds }] = await Promise.all(
		[`${PEGGED_API}/${peggedasset}`, CONFIG_API].map((apiEndpoint) => fetch(apiEndpoint).then((r) => r.json()))
	)

	const peggedChart = await fetch(`${PEGGEDCHART_API}/?peggedAsset=${res.gecko_id}`).then((resp) => resp.json())
	const bridgeInfo = await getPeggedBridgeInfo()
	const pegType = res.pegType

	const totalCirculating = getPrevPeggedTotalFromChart(peggedChart, 0, 'totalCirculating', pegType)
	const unreleased = getPrevPeggedTotalFromChart(peggedChart, 0, 'unreleased', pegType)
	const mcap = peggedChart[peggedChart.length - 1]?.mcap ?? null

	let categories = []
	for (const chain in chainCoingeckoIds) {
		chainCoingeckoIds[chain].categories?.forEach((category) => {
			if (!categories.includes(category)) {
				categories.push(category)
			}
		})
	}

	const categoryExists = categories.includes(category) || category === 'All' || category === 'Non-EVM'

	if (!categoryExists) {
		return {
			notFound: true
		}
	} else {
		categories = [
			{ label: 'All', to: `/peggedasset/${peggedasset}` },
			{ label: 'Non-EVM', to: `/peggedasset/${peggedasset}/Non-EVM` }
		].concat(
			categories.map((category) => ({
				label: category,
				to: `/peggedasset/${peggedasset}/${category}`
			}))
		)
	}

	const chainsUnique: string[] = res.chains.filter((t: string) => {
		const chainCategories = chainCoingeckoIds[t]?.categories ?? []
		if (category === 'All') {
			return true
		} else if (category === 'Non-EVM') {
			return !chainCategories.includes('EVM')
		} else {
			return chainCategories.includes(category)
		}
	})

	let chainsGroupbyParent = {}
	chainsUnique.forEach((chain) => {
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
			category,
			categories,
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
