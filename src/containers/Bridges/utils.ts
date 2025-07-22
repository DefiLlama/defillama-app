import { useMemo } from 'react'
import { keepNeededProperties } from '~/api/shared'
import { capitalizeFirstLetter, getPercentChange, getPrevVolumeFromChart, slug } from '~/utils'

export interface IDailyBridgeStats {
	date: number
	totalTokensDeposited: {
		[token: string]: {
			usdValue: number
			amount: number
			symbol: string
			decimals: number
		}
	}
	totalTokensWithdrawn: {
		[token: string]: {
			usdValue: number
			amount: number
			symbol: string
			decimals: number
		}
	}
	totalAddressDeposited: {
		[address: string]: {
			usdValue: number
			txs: number
		}
	}
	totalAddressWithdrawn: {
		[address: string]: {
			usdValue: number
			txs: number
		}
	}
	name?: string
}

export const bridgePropertiesToKeep = [
	'displayName',
	'name',
	'symbol',
	'icon',
	'chains',
	'lastDailyVolume',
	'dayBeforeLastVolume',
	'weeklyVolume',
	'monthlyVolume',
	'txsPrevDay',
	'change_1d',
	'change_7d',
	'change_1m'
]

export const formatBridgesData = ({
	chain = '',
	bridges = [],
	chartDataByBridge = [],
	bridgeNameToChartDataIndex = {},
	bridgeProps = [...bridgePropertiesToKeep]
}) => {
	let filteredBridges = [...bridges]

	if (chain) {
		filteredBridges = filteredBridges.filter(({ chains = [] }) => chains.map((c) => slug(c)).includes(slug(chain)))
	}

	filteredBridges = filteredBridges.map((bridge) => {
		const chartIndex = bridgeNameToChartDataIndex[bridge.displayName]
		const chart = chartDataByBridge[chartIndex] ?? null

		if (chain) {
			let dayTotalVolume, weekTotalVolume, monthTotalVolume
			dayTotalVolume = weekTotalVolume = monthTotalVolume = 0
			// start from i = 1 to exclude current day
			for (let i = 1; i < 31; i++) {
				const dailyVolume = getPrevVolumeFromChart(chart, i)
				if (i < 2) {
					dayTotalVolume += dailyVolume
				}
				if (i < 8) {
					weekTotalVolume += dailyVolume
				}
				monthTotalVolume += dailyVolume
			}
			bridge.lastDailyVolume = dayTotalVolume ?? null
			bridge.dayBeforeLastVolume = getPrevVolumeFromChart(chart, 2) ?? null
			bridge.weeklyVolume = weekTotalVolume ?? null
			bridge.monthlyVolume = monthTotalVolume ?? null
			bridge.last24hVolume = dayTotalVolume ?? null
		}

		bridge.change_1d = getPercentChange(bridge.lastDailyVolume, bridge.dayBeforeLastVolume)
		bridge.txsPrevDay = getPrevVolumeFromChart(chart, 0, true) ?? null
		// layerzero has 24h delay in the data
		if (bridge.name === 'layerzero' && bridge.txsPrevDay < 1000) {
			bridge.txsPrevDay = getPrevVolumeFromChart(chart, 1, true) ?? null
		}
		bridge.lastDailyVolume = bridge.last24hVolume

		return keepNeededProperties(bridge, bridgeProps)
	})

	const messagingProtocols = ['layerzero', 'wormhole', 'circle', 'hyperlane']
	const regularBridges = filteredBridges.filter((bridge) => !messagingProtocols.includes(bridge.name?.toLowerCase()))
	const messagingProtocolsBridges = filteredBridges.filter((bridge) =>
		messagingProtocols.includes(bridge.name?.toLowerCase())
	)

	const sortedRegularBridges = regularBridges.sort((a, b) => b.lastDailyVolume - a.lastDailyVolume)
	const sortedMessagingProtocols = messagingProtocolsBridges.sort((a, b) => b.lastDailyVolume - a.lastDailyVolume)

	return {
		bridges: sortedRegularBridges,
		messagingProtocols: sortedMessagingProtocols
	}
}

export const formatChainsData = ({
	chains = [],
	chartDataByChain = [],
	chainToChartDataIndex = {},
	prevDayDataByChain = [] as IDailyBridgeStats[],
	netflowsDataDay = null,
	netflowsDataWeek = null
}) => {
	let filteredChains = [...chains]

	filteredChains = filteredChains.map((chain) => {
		const name = chain.name
		const chartIndex = chainToChartDataIndex[name]
		const charts = chartDataByChain[chartIndex] ?? null

		const prevDayData =
			prevDayDataByChain?.find(({ name }) => {
				return name === chain.name
			}) ?? null
		const prevDayChart = charts?.[charts.length - 1]
		const totalTokensDeposited = prevDayData?.totalTokensDeposited
		const totalTokensWithdrawn = prevDayData?.totalTokensWithdrawn

		let prevDayUsdDeposits, prevDayUsdWithdrawals, prevDayNetFlow
		if (netflowsDataDay && Array.isArray(netflowsDataDay)) {
			const chainNetflowDay = netflowsDataDay.find(
				(item) => item.chain && item.chain.toLowerCase() === name.toLowerCase()
			)
			if (chainNetflowDay) {
				prevDayUsdDeposits =
					chainNetflowDay.deposited_usd !== undefined ? Number(chainNetflowDay.deposited_usd) : prevDayChart?.depositUSD
				prevDayUsdWithdrawals =
					chainNetflowDay.withdrawn_usd !== undefined
						? Number(chainNetflowDay.withdrawn_usd)
						: prevDayChart?.withdrawUSD
				prevDayNetFlow =
					chainNetflowDay.net_flow !== undefined
						? Number(chainNetflowDay.net_flow)
						: prevDayUsdDeposits - prevDayUsdWithdrawals
			} else {
				prevDayUsdDeposits = prevDayChart?.depositUSD
				prevDayUsdWithdrawals = prevDayChart?.withdrawUSD
				prevDayNetFlow = prevDayUsdDeposits - prevDayUsdWithdrawals
			}
		} else {
			prevDayUsdDeposits = prevDayChart?.depositUSD
			prevDayUsdWithdrawals = prevDayChart?.withdrawUSD
			prevDayNetFlow = prevDayUsdDeposits - prevDayUsdWithdrawals
		}

		let prevWeekUsdDeposits, prevWeekUsdWithdrawals, prevWeekNetFlow
		if (netflowsDataWeek && Array.isArray(netflowsDataWeek)) {
			const chainNetflowWeek = netflowsDataWeek.find(
				(item) => item.chain && item.chain.toLowerCase() === name.toLowerCase()
			)
			if (chainNetflowWeek) {
				prevWeekUsdDeposits = chainNetflowWeek.deposited_usd !== undefined ? Number(chainNetflowWeek.deposited_usd) : 0
				prevWeekUsdWithdrawals =
					chainNetflowWeek.withdrawn_usd !== undefined ? Number(chainNetflowWeek.withdrawn_usd) : 0
				prevWeekNetFlow =
					chainNetflowWeek.net_flow !== undefined
						? -Number(chainNetflowWeek.net_flow)
						: prevWeekUsdWithdrawals - prevWeekUsdDeposits
			} else {
				const prevWeekCharts = chartDataByChain[chartIndex].slice(-8, -1)
				prevWeekUsdDeposits = 0
				prevWeekUsdWithdrawals = 0
				for (const chart of prevWeekCharts) {
					prevWeekUsdDeposits += chart.depositUSD
					prevWeekUsdWithdrawals += chart.withdrawUSD
				}
				prevWeekNetFlow = prevWeekUsdWithdrawals - prevWeekUsdDeposits
			}
		} else {
			const prevWeekCharts = chartDataByChain[chartIndex].slice(-8, -1)
			prevWeekUsdDeposits = 0
			prevWeekUsdWithdrawals = 0
			for (const chart of prevWeekCharts) {
				prevWeekUsdDeposits += chart.depositUSD
				prevWeekUsdWithdrawals += chart.withdrawUSD
			}
			prevWeekNetFlow = prevWeekUsdWithdrawals - prevWeekUsdDeposits
		}

		let topTokenDepositedSymbol = null,
			topTokenWithdrawnSymbol = null,
			topTokenDepositedUsd = 0,
			topTokenWithdrawnUsd = 0
		if (totalTokensDeposited && Object.keys(totalTokensDeposited).length) {
			const topTokenDeposited = Object.entries(totalTokensDeposited)
				.sort((a, b) => {
					return b[1].usdValue - a[1].usdValue
				})
				.slice(0, 1)[0]
			const topDepositTokenData = topTokenDeposited[1]
			topTokenDepositedSymbol = topDepositTokenData.symbol
			topTokenDepositedUsd = topDepositTokenData.usdValue
		}
		if (totalTokensWithdrawn && Object.keys(totalTokensWithdrawn).length) {
			const topTokenWithdrawn = Object.entries(totalTokensWithdrawn)
				.sort((a, b) => {
					return b[1].usdValue - a[1].usdValue
				})
				.slice(0, 1)[0]
			const topWithdrawnTokenData = topTokenWithdrawn[1]
			topTokenWithdrawnSymbol = topWithdrawnTokenData.symbol
			topTokenWithdrawnUsd = topWithdrawnTokenData.usdValue
		}

		return {
			name: name,
			prevDayUsdDeposits: prevDayUsdDeposits ?? 0,
			prevDayUsdWithdrawals: prevDayUsdWithdrawals ?? 0,
			prevWeekUsdDeposits: prevWeekUsdDeposits ?? 0,
			prevWeekUsdWithdrawals: prevWeekUsdWithdrawals ?? 0,
			topTokenDepositedSymbol: topTokenDepositedSymbol,
			topTokenDepositedUsd: topTokenDepositedUsd,
			topTokenWithdrawnSymbol: topTokenWithdrawnSymbol,
			topTokenWithdrawnUsd: topTokenWithdrawnUsd,
			prevDayNetFlow: prevDayNetFlow ?? 0,
			prevWeekNetFlow: prevWeekNetFlow ?? 0
		}
	})
	return filteredChains
}

export const useBuildBridgeChartData = (bridgeStatsCurrentDay: IDailyBridgeStats) => {
	const { tokenDeposits, tokenWithdrawals } = useMemo(() => {
		const tokensDeposited = bridgeStatsCurrentDay?.totalTokensDeposited
		const tokensWithdrawn = bridgeStatsCurrentDay?.totalTokensWithdrawn
		let tokenDeposits = [],
			tokenWithdrawals = []
		if (tokensDeposited && tokensWithdrawn) {
			let uniqueTokenDeposits = {} as { [symbol: string]: number }
			Object.entries(tokensDeposited).map(([token, tokenData]) => {
				{
					const symbol = tokenData.symbol
					const usdValue = tokenData.usdValue
					uniqueTokenDeposits[symbol] = (uniqueTokenDeposits[symbol] ?? 0) + usdValue
				}
			})
			const fullTokenDeposits = Object.entries(uniqueTokenDeposits).map(([symbol, usdValue]) => {
				return { name: symbol, value: usdValue }
			})
			const otherDeposits = fullTokenDeposits.slice(10).reduce((total, entry) => {
				return (total += entry.value)
			}, 0)
			tokenDeposits = fullTokenDeposits
				.slice(0, 10)
				.sort((a, b) => b.value - a.value)
				.concat({ name: 'Others', value: otherDeposits })

			let uniqueTokenWithdrawals = {} as { [symbol: string]: number }
			Object.entries(tokensWithdrawn).map(([token, tokenData]) => {
				{
					const symbol = tokenData.symbol
					const usdValue = tokenData.usdValue
					uniqueTokenWithdrawals[symbol] = (uniqueTokenWithdrawals[symbol] ?? 0) + usdValue
				}
			})

			const fullTokenWithdrawals = Object.entries(uniqueTokenWithdrawals).map(([symbol, usdValue]) => {
				return { name: symbol, value: usdValue }
			})
			const otherWithdrawals = fullTokenWithdrawals.slice(10).reduce((total, entry) => {
				return (total += entry.value)
			}, 0)
			tokenWithdrawals = fullTokenWithdrawals
				.slice(0, 10)
				.sort((a, b) => b.value - a.value)
				.concat({ name: 'Others', value: otherWithdrawals })
		}

		return { tokenDeposits, tokenWithdrawals }
	}, [bridgeStatsCurrentDay])
	return { tokenDeposits, tokenWithdrawals }
}

const blockExplorersTxs = {
	ethereum: ['https://etherscan.io/tx/', 'Etherscan'],
	bsc: ['https://bscscan.com/tx/', 'Bscscan'],
	xdai: ['https://gnosisscan.io/tx/', 'GnosisScan'],
	avax: ['https://snowtrace.io/tx/', 'Snowtrace'],
	fantom: ['https://ftmscan.com/tx/', 'FTMscan'],
	heco: ['https://hecoinfo.com/tx/', 'HecoInfo'],
	polygon: ['https://polygonscan.com/tx/', 'PolygonScan'],
	solana: ['https://solscan.io/tx/', 'Solscan'],
	arbitrum: ['https://arbiscan.io/tx/', 'Arbiscan'],
	optimism: ['https://optimistic.etherscan.io/tx/', 'Optimism Explorer'],
	aurora: ['https://aurorascan.dev/tx/', 'AuroraScan'],
	celo: ['https://explorer.celo.org/mainnet/tx/', 'Celo Explorer'],
	klaytn: ['https://scope.klaytn.com/tx/, Klaytn Scope']
}

const blockExplorersAddresses = {
	ethereum: ['https://etherscan.io/address/', 'Etherscan'],
	bsc: ['https://bscscan.com/address/', 'Bscscan'],
	xdai: ['https://gnosisscan.io/address/', 'GnosisScan'],
	avax: ['https://snowtrace.io/address/', 'Snowtrace'],
	fantom: ['https://ftmscan.com/address/', 'FTMscan'],
	heco: ['https://hecoinfo.com/address/', 'HecoInfo'],
	polygon: ['https://polygonscan.com/address/', 'PolygonScan'],
	solana: ['https://solscan.io/address/', 'Solscan'],
	arbitrum: ['https://arbiscan.io/address/', 'Arbiscan'],
	optimism: ['https://optimistic.etherscan.io/address/', 'Optimism Explorer'],
	aurora: ['https://aurorascan.dev/address/', 'AuroraScan'],
	celo: ['https://explorer.celo.org/mainnet/address/', 'Celo Explorer'],
	klaytn: ['https://scope.klaytn.com/account/, Klaytn Scope']
}

export const getBlockExplorerForTx = (txHash: string = '') => {
	let blockExplorerLink, blockExplorerName
	if (txHash?.includes(':')) {
		const [chain, chainHash] = txHash.split(':')
		const explorer = blockExplorersTxs[chain]
		if (explorer !== undefined) {
			blockExplorerLink = explorer[0] + chainHash
			blockExplorerName = explorer[1]
		}
	} else {
		if (typeof txHash === 'string' && txHash !== '') {
			blockExplorerLink = 'https://etherscan.io/tx/' + txHash
			blockExplorerName = 'Etherscan'
		}
	}

	return {
		blockExplorerLink,
		blockExplorerName
	}
}

export const getBlockExplorerForAddress = (txHash: string = '') => {
	let blockExplorerLink, blockExplorerName, chainName
	if (txHash?.includes(':')) {
		const [chain, chainHash] = txHash.split(':')
		const explorer = blockExplorersAddresses[chain]
		if (explorer !== undefined) {
			blockExplorerLink = explorer[0] + chainHash
			blockExplorerName = explorer[1]
		}
		chainName = chain
			? chain
					.split('_')
					.map((x) => capitalizeFirstLetter(x))
					.join(' ')
			: 'Ethereum'
	} else {
		if (typeof txHash === 'string' && txHash !== '') {
			blockExplorerLink = 'https://etherscan.io/address/' + txHash
			blockExplorerName = 'Etherscan'
			chainName = 'Ethereum'
		}
	}

	return {
		blockExplorerLink,
		blockExplorerName,
		chainName
	}
}
