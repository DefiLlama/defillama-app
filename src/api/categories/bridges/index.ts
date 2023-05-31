import { standardizeProtocolName, chainIconUrl, tokenIconUrl, getRandomColor } from '~/utils'
import { formatBridgesData, formatChainsData } from './utils'
import type { IChainData } from '~/api/types'
import { CONFIG_API, BRIDGEDAYSTATS_API, BRIDGES_API, BRIDGEVOLUME_API, BRIDGELARGETX_API } from '~/constants'
import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

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
			return b.lastDailyVolume - a.lastDailyVolume
		})
		.map((chain) => chain.name)

	const chainVolumeData: IChainData[] = await getChainVolumeData(chain, chainCoingeckoIds)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000)
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp
	let bridgeStatsCurrentDay = {}
	if (chain) {
		bridgeStatsCurrentDay = await fetch(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain}`).then((resp) =>
			resp.json()
		)
	}

	const numberOfDaysForLargeTx = chain ? 7 : 1
	const secondsInDay = 3600 * 24
	const unformattedLargeTxsData = await getLargeTransactionsData(
		chain,
		currentTimestamp - numberOfDaysForLargeTx * secondsInDay,
		currentTimestamp
	)
	const largeTxsData = unformattedLargeTxsData.map((transaction) => {
		const { token, symbol, isDeposit, chain: txChain } = transaction
		const symbolAndTokenForExplorer = `${symbol}#${token}`
		let correctedIsDeposit = isDeposit
		if (chain) {
			correctedIsDeposit = chain.toLowerCase() === txChain.toLowerCase() ? isDeposit : !isDeposit
		}
		return { ...transaction, isDeposit: correctedIsDeposit, symbol: symbolAndTokenForExplorer }
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
		let sortednetFlows = Object.entries(netFlows).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

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
			const chainName = chain === 'Others' ? 'Others' : chain.name
			if (chainName !== 'Others') {
				const chartIndex = chainToChartDataIndex[chainName]
				if (chartDataByChain[chartIndex].length === 0) return { data: [] }
			}
			return {
				name: chainName,
				data: chartDates.map((date) => [
					JSON.parse(JSON.stringify(new Date((parseInt(date) + 43200) * 1000))), // shifted forward by 12 hours, so the date is at 12:00 UTC instead of 00:00 UTC
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

	const { id, chains, icon, displayName } = bridgeData
	const defaultChain = chains[0]
	const [iconType, iconName] = icon.split(':')
	const logo = iconType === 'chain' ? chainIconUrl(iconName) : tokenIconUrl(iconName)

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
		logo,
		chains,
		defaultChain,
		chainToChartDataIndex,
		bridgeChartDataByChain,
		prevDayDataByChain
	}
}

export async function getBridgePageDatanew(bridge: string) {
	// fetch list of all bridges
	const { bridges } = await getBridges()

	// find datqa of bridge
	const bridgeData = bridges.filter(
		(obj) => standardizeProtocolName(obj.displayName) === standardizeProtocolName(bridge)
	)[0]

	const { id, chains, icon, displayName } = bridgeData

	const [iconType, iconName] = icon.split(':')
	// get logo based on icon type (chain or protocol)
	const logo = iconType === 'chain' ? chainIconUrl(iconName) : tokenIconUrl(iconName)

	const volumeDataByChain = {}

	const volume = await Promise.all(
		chains.map(async (chain) => {
			for (let i = 0; i < 5; i++) {
				try {
					const charts = await fetch(`${BRIDGEVOLUME_API}/${chain}?id=${id}`).then((resp) => resp.json())
					return charts
				} catch (e) {}
			}

			throw new Error(`${BRIDGEVOLUME_API}/${chain} is broken`)
		})
	)

	const volumeOnAllChains: {
		[date: number]: {
			date: number
			Deposited: number
			Withdrawn: number
		}
	} = {}

	volume.forEach((chainVolume, index) => {
		const chartData = []

		chainVolume.forEach((item) => {
			const date = Number(item.date)
			chartData.push({ date, Deposited: item.depositUSD, Withdrawn: -item.withdrawUSD })

			if (!volumeOnAllChains[date]) {
				volumeOnAllChains[date] = { date, Deposited: 0, Withdrawn: 0 }
			}

			volumeOnAllChains[date] = {
				date,
				Deposited: volumeOnAllChains[date].Deposited + (item.depositUSD || 0),
				Withdrawn: volumeOnAllChains[date].Withdrawn - (item.withdrawUSD || 0)
			}
		})

		volumeDataByChain[chains[index]] = chartData
	})

	volumeDataByChain['All Chains'] = Object.values(volumeOnAllChains)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000)
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600

	const statsOnPrevDay = await Promise.all(
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

	const prevDayDataByChain = {}

	statsOnPrevDay.forEach((data, index) => {
		prevDayDataByChain['All Chains'] = {
			date: Math.max(prevDayDataByChain['All Chains']?.date ?? 0, data.date),
			totalTokensDeposited: {
				...(prevDayDataByChain['All Chains']?.totalTokensDeposited ?? {}),
				...data.totalTokensDeposited
			},
			totalTokensWithdrawn: {
				...(prevDayDataByChain['All Chains']?.totalTokensWithdrawn ?? {}),
				...data.totalTokensWithdrawn
			},
			totalAddressDeposited: {
				...(prevDayDataByChain['All Chains']?.totalAddressDeposited ?? {}),
				...data.totalAddressDeposited
			},
			totalAddressWithdrawn: {
				...(prevDayDataByChain['All Chains']?.totalAddressWithdrawn ?? {}),
				...data.totalAddressWithdrawn
			}
		}

		prevDayDataByChain[chains[index]] = data
	})

	const chainsList = ['All Chains', ...chains]

	const tableDataByChain = {}
	chainsList.forEach((currentChain) => {
		const prevDayData = prevDayDataByChain[currentChain]
		let tokensTableData = [],
			addressesTableData = [],
			tokenDeposits = [],
			tokenWithdrawals = [],
			tokenColor = {}
		if (prevDayData) {
			const totalTokensDeposited = prevDayData.totalTokensDeposited
			const totalTokensWithdrawn = prevDayData.totalTokensWithdrawn
			let tokensTableUnformatted = {}
			Object.entries(totalTokensDeposited).map(([token, tokenData]: [string, { symbol: string; usdValue: number }]) => {
				const symbol = tokenData.symbol == null || tokenData.symbol === '' ? 'unknown' : tokenData.symbol
				const usdValue = tokenData.usdValue
				const key = `${symbol}#${token}`
				tokensTableUnformatted[key] = tokensTableUnformatted[key] || {}
				tokensTableUnformatted[key].deposited = (tokensTableUnformatted[key].deposited ?? 0) + usdValue
				tokensTableUnformatted[key].volume = (tokensTableUnformatted[key].volume ?? 0) + usdValue
				// ensure there are no undefined values for deposited/withdrawn so table can be sorted
				tokensTableUnformatted[key].withdrawn = 0
			})
			Object.entries(totalTokensWithdrawn).map(([token, tokenData]: [string, { symbol: string; usdValue: number }]) => {
				const symbol = tokenData.symbol == null || tokenData.symbol === '' ? 'unknown' : tokenData.symbol
				const usdValue = tokenData.usdValue ?? 0
				const key = `${symbol}#${token}`
				tokensTableUnformatted[key] = tokensTableUnformatted[key] || {}
				tokensTableUnformatted[key].withdrawn = (tokensTableUnformatted[key].withdrawn ?? 0) + usdValue
				tokensTableUnformatted[key].volume = (tokensTableUnformatted[key].volume ?? 0) + usdValue
				if (!tokensTableUnformatted[key].deposited) {
					tokensTableUnformatted[key].deposited = 0
				}
			})

			tokensTableData = Object.entries(tokensTableUnformatted)
				.filter(([symbol, volumeData]: [string, any]) => {
					return volumeData.volume !== 0
				})
				.map((entry: [string, object]) => {
					return { symbol: entry[0], ...entry[1] }
				})

			const fullTokenDeposits = Object.values(totalTokensDeposited).map(
				(tokenData: { symbol: string; usdValue: number }) => {
					return { name: tokenData.symbol, value: tokenData.usdValue }
				}
			)
			const otherDeposits = fullTokenDeposits.slice(10).reduce((total, entry) => {
				return (total += entry.value)
			}, 0)
			tokenDeposits = fullTokenDeposits
				.slice(0, 10)
				.sort((a, b) => b.value - a.value)
				.concat({ name: 'Others', value: otherDeposits })
			const fullTokenWithdrawals = Object.values(totalTokensWithdrawn).map(
				(tokenData: { symbol: string; usdValue: number }) => {
					return { name: tokenData.symbol, value: tokenData.usdValue }
				}
			)
			const otherWithdrawals = fullTokenWithdrawals.slice(10).reduce((total, entry) => {
				return (total += entry.value)
			}, 0)
			tokenWithdrawals = fullTokenWithdrawals
				.slice(0, 10)
				.sort((a, b) => b.value - a.value)
				.concat({ name: 'Others', value: otherWithdrawals })
			tokenColor = Object.fromEntries(
				[...tokenDeposits, ...tokenWithdrawals, 'Others'].map((token) => {
					return typeof token === 'string' ? ['-', getRandomColor()] : [token.name, getRandomColor()]
				})
			)
			const totalAddressesDeposited = prevDayData.totalAddressDeposited
			const totalAddressesWithdrawn = prevDayData.totalAddressWithdrawn
			let addressesTableUnformatted = {}
			Object.entries(totalAddressesDeposited).map(
				([address, addressData]: [string, { txs: number; deposited: number; usdValue: number }]) => {
					const txs = addressData.txs
					const usdValue = addressData.usdValue
					addressesTableUnformatted[address] = addressesTableUnformatted[address] || {}
					addressesTableUnformatted[address].deposited = (addressesTableUnformatted[address].deposited ?? 0) + usdValue
					addressesTableUnformatted[address].txs = (addressesTableUnformatted[address].txs ?? 0) + txs
				}
			)
			Object.entries(totalAddressesWithdrawn).map(
				([address, addressData]: [string, { txs: number; deposited: number; usdValue: number }]) => {
					const txs = addressData.txs
					const usdValue = addressData.usdValue
					addressesTableUnformatted[address] = addressesTableUnformatted[address] || {}
					addressesTableUnformatted[address].withdrawn = (addressesTableUnformatted[address].withdrawn ?? 0) + usdValue
					addressesTableUnformatted[address].txs = (addressesTableUnformatted[address].txs ?? 0) + txs
				}
			)
			addressesTableData = Object.entries(addressesTableUnformatted)
				.filter(([address, addressData]: [string, any]) => {
					return addressData.txs !== 0
				})
				.map((entry: [string, object]) => {
					return { address: entry[0], deposited: 0, withdrawn: 0, ...entry[1] }
				})
		}

		tableDataByChain[currentChain] = {
			tokensTableData,
			addressesTableData,
			tokenDeposits,
			tokenWithdrawals,
			tokenColor
		}
	})

	return {
		displayName,
		logo,
		chains: ['All Chains', ...chains],
		defaultChain: 'All Chains',
		volumeDataByChain,
		tableDataByChain
	}
}
