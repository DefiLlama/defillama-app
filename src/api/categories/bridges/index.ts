import { standardizeProtocolName } from '~/utils'
import { formatBridgesData, formatChainsData } from './utils'
import type { IChainData } from '~/api/types'
import { CONFIG_API, BRIDGEDAYSTATS_API, BRIDGES_API, BRIDGEVOLUME_API, BRIDGELARGETX_API } from '~/constants'

export const getBridges = () =>
	fetch(BRIDGES_API + '/?includeChains=true')
		.then((r) => r.json())
		.then(({ bridges, chains }) => ({
			bridges,
			chains
		}))

const getChainVolumeData = async (chain: string, chainCoingeckoIds) => {
	if (chain) {
		if (chainCoingeckoIds[chain]) {
			for (let i = 0; i < 5; i++) {
				try {
					const chart = await fetch(`${BRIDGEVOLUME_API}/${chain}`).then((resp) => resp.json())
					const formattedChart = chart.map((chart) => {
						// This is confusing, stats from the endpoint use "deposit" to mean deposit in bridge contract,
						// i.e., a withdrawal from the chain. Will eventually change that.
						return {
							date: chart.date,
							Deposits: chart.withdrawUSD,
							Withdrawals: -chart.depositUSD
						}
					})
					return formattedChart
				} catch (e) {}
			}
			throw new Error(`${BRIDGEVOLUME_API}/${chain} is broken`)
		} else return null
	} else {
		const chart = await fetch(BRIDGEVOLUME_API + '/all').then((resp) => resp.json())
		const formattedChart = chart.map((chart) => {
			return {
				date: chart.date,
				volume: (chart.withdrawUSD + chart.depositUSD) / 2,
				txs: chart.depositTxs + chart.withdrawTxs
			}
		})
		return formattedChart
	}
}

const getLargeTransactionsData = async (chain: string, startTimestamp: number, endTimestamp: number) => {
	for (let i = 0; i < 5; i++) {
		try {
			if (chain) {
				return await fetch(
					`${BRIDGELARGETX_API}/${chain}?starttimestamp=${startTimestamp}&endtimestamp=${endTimestamp}`
				).then((resp) => resp.json())
			} else {
				return await fetch(
					`${BRIDGELARGETX_API}/all?starttimestamp=${startTimestamp}&endtimestamp=${endTimestamp}`
				).then((resp) => resp.json())
			}
		} catch (e) {}
	}
	throw new Error(`${BRIDGELARGETX_API}/${chain} is broken`)
}

export async function getBridgeOverviewPageData(chain) {
	const { bridges, chains } = await getBridges()
	const { chainCoingeckoIds } = await fetch(CONFIG_API).then((r) => r.json())

	let chartDataByBridge = []
	let bridgeNames: string[] = []
	let bridgeNameToChartDataIndex: object = {}
	chartDataByBridge = await Promise.all(
		bridges.map(async (elem, i) => {
			bridgeNames.push(elem.displayName)
			bridgeNameToChartDataIndex[elem.displayName] = i
			for (let i = 0; i < 5; i++) {
				try {
					let charts = []
					if (!chain) {
						charts = await fetch(`${BRIDGEVOLUME_API}/all?id=${elem.id}`).then((resp) => resp.json())
					} else {
						charts = await fetch(`${BRIDGEVOLUME_API}/${chain}?id=${elem.id}`).then((resp) => resp.json())
					}
					// can format differently here if needed
					let formattedCharts
					if (!chain) {
						formattedCharts = charts.map((chart) => {
							return {
								date: chart.date,
								volume: (chart.withdrawUSD + chart.depositUSD) / 2,
								txs: chart.depositTxs + chart.withdrawTxs
							}
						})
					} else {
						formattedCharts = charts.map((chart) => {
							return {
								date: chart.date,
								volume: chart.withdrawUSD + chart.depositUSD,
								txs: chart.depositTxs + chart.withdrawTxs
							}
						})
					}
					return formattedCharts
				} catch (e) {}
			}
			throw new Error(`${BRIDGEVOLUME_API}/?id=${elem.id} is broken`)
		})
	)

	// order of chains will update every 24 hrs, can consider changing metric sorted by here
	const chainList = await chains
		.sort((a, b) => {
			return b.volumePrevDay - a.volumePrevDay
		})
		.map((chain) => chain.name)

	const chainVolumeData: IChainData[] = await getChainVolumeData(chain, chainCoingeckoIds)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000)
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600
	let bridgeStatsCurrentDay = {}
	if (chain) {
		bridgeStatsCurrentDay = await fetch(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain}`).then((resp) =>
			resp.json()
		)
	}

	const secondsInDay = 3600 * 24
	const unformattedLargeTxsData = await getLargeTransactionsData(
		chain,
		currentTimestamp - 7 * secondsInDay,
		currentTimestamp
	)
	const largeTxsData = unformattedLargeTxsData.map((transaction) => {
		const { token, symbol } = transaction
		const symbolAndTokenForExplorer = `${symbol}#${token}`
		return { ...transaction, symbol: symbolAndTokenForExplorer }
	})

	const filteredBridges = formatBridgesData({
		bridges,
		chartDataByBridge,
		bridgeNameToChartDataIndex,
		chain
	})

	return {
		chains: chainList,
		filteredBridges,
		bridgeNames,
		bridgeNameToChartDataIndex,
		chartDataByBridge,
		chainVolumeData,
		bridgeStatsCurrentDay,
		largeTxsData,
		chain: chain ?? 'All'
	}
}

export async function getBridgeChainsPageData() {
	const { chains } = await getBridges()

	let chartDataByChain = []
	let chainToChartDataIndex: object = {}
	chartDataByChain = await Promise.all(
		chains.map(async (chain, i) => {
			chainToChartDataIndex[chain.name] = i
			for (let i = 0; i < 5; i++) {
				try {
					const charts = await fetch(`${BRIDGEVOLUME_API}/${chain.name}`).then((resp) => resp.json())
					return charts
				} catch (e) {}
			}
			throw new Error(`${BRIDGEVOLUME_API}/${chain.name} is broken`)
		})
	)

	let unformattedChartData = {}
	let useOthers = false
	chains.map((chain, i) => {
		const charts = chartDataByChain[i]
		charts.map((chart) => {
			const date = chart.date
			const netFlow = chart.withdrawUSD - chart.depositUSD
			unformattedChartData[date] = unformattedChartData[date] || {}
			unformattedChartData[date][chain.name] = netFlow
		})
	})
	const chartDates = Object.keys(unformattedChartData)
	const formattedChartEntries = Object.entries(unformattedChartData).reduce((acc, data) => {
		const date = data[0]
		const netFlows = data[1] as { [chain: string]: number }
		let sortednetFlows = Object.entries(netFlows).sort((a, b) => b[1] - a[1])

		if (sortednetFlows.length > 11) {
			useOthers = true
			const othersnetFlow = sortednetFlows.slice(11).reduce((acc, curr: [string, number]) => (acc += curr[1]), 0)
			sortednetFlows = [...sortednetFlows.slice(0, 11), ['Others', othersnetFlow]]
		}
		return { ...acc, ...{ [date]: Object.fromEntries(sortednetFlows) } }
	}, {})

	const formattedVolumeChartData = [...chains, 'Others']
		.map((chain) => {
			if (chain === 'Others' && !useOthers) return { data: [] }
			const chainName = chain.name
			const chartIndex = chainToChartDataIndex[chainName]
			if (chartDataByChain[chartIndex].length === 0) return { data: [] }
			return {
				name: chainName,
				data: chartDates.map((date) => [
					JSON.parse(JSON.stringify(new Date(parseInt(date) * 1000))),
					formattedChartEntries[date][chainName] ?? 0
				])
			}
		})
		.filter((chart) => chart.data.length !== 0)

	// order of chains will update every 24 hrs, can consider changing metric sorted by here
	const chainList = await chains
		.sort((a, b) => {
			return b.volumePrevDay - a.volumePrevDay
		})
		.map((chain) => chain.name)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000)
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600
	let prevDayDataByChain = []
	prevDayDataByChain = await Promise.all(
		chains.map(async (chain) => {
			for (let i = 0; i < 5; i++) {
				try {
					const charts = await fetch(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain.name}`).then((resp) =>
						resp.json()
					)
					// can format differently here if needed
					return charts
				} catch (e) {}
			}
			throw new Error(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain.name} is broken`)
		})
	)

	const filteredChains = formatChainsData({
		chains,
		chartDataByChain,
		chainToChartDataIndex,
		prevDayDataByChain
	})

	return {
		chains: chainList,
		filteredChains,
		chainToChartDataIndex,
		formattedVolumeChartData
	}
}

export async function getBridgePageData(bridge: string) {
	const { bridges } = await getBridges()
	const bridgeData = bridges.filter(
		(obj) => standardizeProtocolName(obj.displayName) === standardizeProtocolName(bridge)
	)[0]

	const { id, chains, displayName } = bridgeData
	const defaultChain = chains[0]

	let bridgeChartDataByChain = []
	let chainToChartDataIndex: object = {}
	bridgeChartDataByChain = await Promise.all(
		chains.map(async (chain, i) => {
			chainToChartDataIndex[chain] = i
			for (let i = 0; i < 5; i++) {
				try {
					const charts = await fetch(`${BRIDGEVOLUME_API}/${chain}?id=${id}`).then((resp) => resp.json())
					return charts
				} catch (e) {}
			}
			throw new Error(`${BRIDGEVOLUME_API}/${chain} is broken`)
		})
	)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000)
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600
	let prevDayDataByChain = []
	prevDayDataByChain = await Promise.all(
		chains.map(async (chain) => {
			for (let i = 0; i < 5; i++) {
				try {
					const charts = await fetch(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain}?id=${id}`).then((resp) =>
						resp.json()
					)
					// can format differently here if needed
					return charts
				} catch (e) {}
			}
			throw new Error(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain} is broken`)
		})
	)

	return {
		displayName,
		chains,
		defaultChain,
		chainToChartDataIndex,
		bridgeChartDataByChain,
		prevDayDataByChain
	}
}
