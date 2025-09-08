import type { IChainData } from '~/api/types'
import {
	BRIDGEDAYSTATS_API,
	BRIDGELARGETX_API,
	BRIDGES_API,
	BRIDGEVOLUME_API,
	CONFIG_API,
	NETFLOWS_API
} from '~/constants'
import { chainIconUrl, getNDistinctColors, preparePieChartData, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import { formatBridgesData, formatChainsData } from './utils'

export const getBridges = () =>
	fetchJson(BRIDGES_API + '?includeChains=true').then(({ bridges, chains }) => ({
		bridges,
		chains
	}))

const getChainVolumeData = async (chain: string, chainCoingeckoIds) => {
	if (chain) {
		if (chainCoingeckoIds[chain]) {
			for (let i = 0; i < 5; i++) {
				try {
					const chart = await fetchJson(`${BRIDGEVOLUME_API}/${chain}`)
					const formattedChart = chart.map((chart) => {
						// This is confusing, stats from the endpoint use "deposit" to mean deposit in bridge contract,
						// i.e., a withdrawal from the chain. Will eventually change that.
						return {
							date: chart.date,
							Deposits: chart.depositUSD,
							Withdrawals: -chart.withdrawUSD
						}
					})
					return formattedChart
				} catch (e) {}
			}
			throw new Error(`${BRIDGEVOLUME_API}/${chain} is broken`)
		} else return null
	} else {
		const chart = await fetchJson(BRIDGEVOLUME_API + '/all')
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
				return await fetchJson(
					`${BRIDGELARGETX_API}/${chain}?starttimestamp=${startTimestamp}&endtimestamp=${endTimestamp}`
				)
			} else {
				return await fetchJson(`${BRIDGELARGETX_API}/all?starttimestamp=${startTimestamp}&endtimestamp=${endTimestamp}`)
			}
		} catch (e) {}
	}
	return []
}

export async function getBridgeOverviewPageData(chain) {
	const [{ bridges, chains }, { chainCoingeckoIds }] = await Promise.all([getBridges(), fetchJson(CONFIG_API)])

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
						charts = await fetchJson(`${BRIDGEVOLUME_API}/all?id=${elem.id}`)
					} else {
						charts = await fetchJson(`${BRIDGEVOLUME_API}/${chain}?id=${elem.id}`)
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
								volume: (chart.withdrawUSD + chart.depositUSD) / 2,
								txs: chart.depositTxs + chart.withdrawTxs
							}
						})
					}
					return formattedCharts
				} catch (e) {}
			}
			return []
		})
	)

	// order of chains will update every 24 hrs, can consider changing metric sorted by here
	const chainList = await chains
		.sort((a, b) => {
			return b.lastDailyVolume - a.lastDailyVolume
		})
		.map((chain) => chain.name)

	const chainVolumeData: IChainData[] = await getChainVolumeData(chain, chainCoingeckoIds)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000 / 3600) * 3600
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp
	let bridgeStatsCurrentDay = {}
	if (chain) {
		for (let i = 0; i < 5; i++) {
			try {
				bridgeStatsCurrentDay = await fetchJson(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain}`)
				// can format differently here if needed
			} catch (e) {}
		}
	}

	const numberOfDaysForLargeTx = chain ? 7 : 1
	const secondsInDay = 3600 * 24
	const unformattedLargeTxsData = await getLargeTransactionsData(
		chain,
		currentTimestamp - numberOfDaysForLargeTx * secondsInDay,
		currentTimestamp
	)
	const largeTxsData = Array.isArray(unformattedLargeTxsData)
		? unformattedLargeTxsData.map((transaction) => {
				const { token, symbol, isDeposit, chain: txChain } = transaction
				const symbolAndTokenForExplorer = `${symbol}#${token}`
				let correctedIsDeposit = isDeposit
				if (chain) {
					correctedIsDeposit = chain.toLowerCase() === txChain.toLowerCase() ? isDeposit : !isDeposit
				}
				return { ...transaction, isDeposit: correctedIsDeposit, symbol: symbolAndTokenForExplorer }
			})
		: []

	const { bridges: filteredBridges, messagingProtocols } = formatBridgesData({
		bridges,
		chartDataByBridge,
		bridgeNameToChartDataIndex,
		chain
	})

	return {
		chains: chainList,
		filteredBridges,
		messagingProtocols,
		bridgeNames,
		bridgeNameToChartDataIndex,
		chartDataByBridge,
		chainVolumeData: chainVolumeData ?? [],
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
					const charts = await fetchJson(`${BRIDGEVOLUME_API}/${chain.name}`)
					return charts
				} catch (e) {}
			}
			return []
		})
	)

	let chartData: Record<string, Record<string, number>> = {}

	chains.forEach((chain, i) => {
		const charts = chartDataByChain[i]
		charts.forEach((chart) => {
			const date = chart.date
			const netFlow = chart.depositUSD - chart.withdrawUSD
			chartData[date] = chartData[date] || {}
			chartData[date][chain.name] = netFlow
		})
	})

	// order of chains will update every 24 hrs, can consider changing metric sorted by here
	const chainList = await chains
		.sort((a, b) => {
			return b.volumePrevDay - a.volumePrevDay
		})
		.map((chain) => chain.name)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000 / 3600) * 3600
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600

	let netflowsDataDay = null
	let netflowsDataWeek = null
	try {
		;[netflowsDataDay, netflowsDataWeek] = await Promise.all([
			fetchJson(`${NETFLOWS_API}/day`).catch(() => null),
			fetchJson(`${NETFLOWS_API}/week`).catch(() => null)
		])
	} catch (e) {
		console.error('Failed to fetch netflows data:', e)
	}

	let prevDayDataByChain = []
	prevDayDataByChain = (
		await Promise.all(
			chains.map(async (chain) => {
				for (let i = 0; i < 5; i++) {
					try {
						const charts = await fetchJson(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain.name}`)
						return { ...charts, name: chain.name }
					} catch (e) {}
				}
				//throw new Error(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain.name} is broken`)
			})
		)
	).filter((t) => t !== undefined)

	const filteredChains = formatChainsData({
		chains,
		chartDataByChain,
		chainToChartDataIndex,
		prevDayDataByChain,
		netflowsDataDay,
		netflowsDataWeek
	})

	return {
		allChains: chainList,
		tableData: filteredChains,
		chartData: Object.entries(chartData).map(([date, data]: [string, Record<string, number>]) => ({
			date,
			...data
		})),
		chartStacks: Object.fromEntries(chainList.map((chain) => [chain, chain]))
	}
}

export async function getBridgePageData(bridge: string) {
	const { bridges } = await getBridges()
	const bridgeData = bridges.filter((obj) => slug(obj.displayName) === slug(bridge))[0]

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
					const charts = await fetchJson(`${BRIDGEVOLUME_API}/${chain}?id=${id}`)
					return charts
				} catch (e) {}
			}
			return []
		})
	)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000 / 3600) * 3600
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600
	let prevDayDataByChain = []
	prevDayDataByChain = await Promise.all(
		chains.map(async (chain) => {
			for (let i = 0; i < 5; i++) {
				try {
					const charts = await fetchJson(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain}?id=${id}`)
					// can format differently here if needed
					return charts
				} catch (e) {}
			}
			return []
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
	const bridgeData = bridges.filter((obj) => slug(obj.displayName) === slug(bridge))[0]

	const { id, chains, icon, displayName, destinationChain } = bridgeData

	const [iconType, iconName] = icon.split(':')
	// get logo based on icon type (chain or protocol)
	const logo = iconType === 'chain' ? chainIconUrl(iconName) : tokenIconUrl(iconName)

	const volumeDataByChain = {}

	const volume = await Promise.all(
		chains.map(async (chain) => {
			for (let i = 0; i < 5; i++) {
				try {
					const charts = await fetchJson(`${BRIDGEVOLUME_API}/${chain}?id=${id}`)
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

	volumeDataByChain['All Chains'] =
		destinationChain !== 'false' ? (volumeDataByChain?.[destinationChain] ?? []) : Object.values(volumeOnAllChains)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000 / 3600) * 3600
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600

	const statsOnPrevDay = await Promise.all(
		chains.map(async (chain) => {
			for (let i = 0; i < 5; i++) {
				try {
					const charts = await fetchJson(`${BRIDGEDAYSTATS_API}/${prevDayTimestamp}/${chain}?id=${id}`)
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

	if (destinationChain !== 'false') {
		prevDayDataByChain[destinationChain] = prevDayDataByChain['All Chains']
	}

	const chainsList = ['All Chains', ...chains, destinationChain !== false ? destinationChain : null].filter(
		(chain) => chain
	)

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

			let fullTokenDeposits = Object.values(totalTokensDeposited).map(
				(tokenData: { symbol: string; usdValue: number }) => {
					return { name: tokenData.symbol, value: tokenData.usdValue }
				}
			)
			let fullTokenWithdrawals = Object.values(totalTokensWithdrawn).map(
				(tokenData: { symbol: string; usdValue: number }) => {
					return { name: tokenData.symbol, value: tokenData.usdValue }
				}
			)

			if (currentChain === 'All Chains') {
				const allTokensSymbols = new Set(
					Object.values(totalTokensDeposited).map((token: { symbol: string; usdValue: number }) => token.symbol)
				)
				fullTokenDeposits = Array.from(allTokensSymbols).reduce((acc, symbol) => {
					const sameTokenDeposits = fullTokenDeposits.filter((token) => token.name === symbol)
					const totalValue = sameTokenDeposits.reduce((total, entry) => {
						return (total += entry.value)
					}, 0)
					return acc.concat({ name: symbol, value: totalValue })
				}, [])

				const allTokensSymbolsWithdrawn = new Set(
					Object.values(totalTokensWithdrawn).map((token: { symbol: string; usdValue: number }) => token.symbol)
				)
				fullTokenWithdrawals = Array.from(allTokensSymbolsWithdrawn).reduce((acc, symbol) => {
					const sameTokenWithdrawals = fullTokenWithdrawals.filter((token) => token.name === symbol)
					const totalValue = sameTokenWithdrawals.reduce((total, entry) => {
						return (total += entry.value)
					}, 0)
					return acc.concat({ name: symbol, value: totalValue })
				}, [])
			}

			const tokenDeposits = preparePieChartData({
				data: fullTokenDeposits,
				limit: 15
			})
			const tokenWithdrawals = preparePieChartData({
				data: fullTokenWithdrawals,
				limit: 15
			})

			const colors = getNDistinctColors(tokenDeposits.length + tokenWithdrawals.length)

			tokenColor = Object.fromEntries(
				[...tokenDeposits, ...tokenWithdrawals, 'Others'].map((token, i) => {
					return typeof token === 'string' ? ['-', colors[i]] : [token.name, colors[i]]
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
		tableDataByChain,
		config: bridgeData
	}
}
