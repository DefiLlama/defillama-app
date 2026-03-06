import { useMemo } from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import { capitalizeFirstLetter, getPercentChange, getPrevVolumeFromChart, keepNeededProperties, slug } from '~/utils'
import { BLOCK_EXPLORERS_ADDRESSES, BLOCK_EXPLORERS_TXS, BRIDGE_PROPERTIES_TO_KEEP } from './constants'

interface ITokenData {
	usdValue: number
	amount: number
	symbol: string
	decimals: number
}

interface IDailyBridgeStats {
	date: number
	totalTokensDeposited: {
		[token: string]: ITokenData
	}
	totalTokensWithdrawn: {
		[token: string]: ITokenData
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

export const formatBridgesData = ({
	chain = '',
	bridges = [],
	chartDataByBridge = [],
	bridgeNameToChartDataIndex = {},
	bridgeProps = [...BRIDGE_PROPERTIES_TO_KEEP]
}) => {
	let filteredBridges = [...bridges]

	if (chain) {
		const sluggedChain = slug(chain)
		filteredBridges = filteredBridges.filter(({ chains = [] }) => chains.some((c) => slug(c) === sluggedChain))
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
		if (bridge.txsPrevDay == null) {
			bridge.txsPrevDay = getPrevVolumeFromChart(chart, 0, true) ?? null
			if (bridge.name === 'layerzero' && bridge.txsPrevDay < 1000) {
				bridge.txsPrevDay = getPrevVolumeFromChart(chart, 1, true) ?? null
			}
		}
		bridge.lastDailyVolume = bridge.last24hVolume

		return keepNeededProperties(bridge, bridgeProps)
	})
	const messagingProtocols = ['layerzero', 'wormhole', 'circle', 'hyperlane', 'ccip', 'hyperbridge']
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
						? Number(chainNetflowWeek.net_flow)
						: prevWeekUsdDeposits - prevWeekUsdWithdrawals
			} else {
				const prevWeekCharts = chartDataByChain[chartIndex].slice(-8, -1)
				prevWeekUsdDeposits = 0
				prevWeekUsdWithdrawals = 0
				for (const chart of prevWeekCharts) {
					prevWeekUsdDeposits += chart.depositUSD
					prevWeekUsdWithdrawals += chart.withdrawUSD
				}
				prevWeekNetFlow = prevWeekUsdDeposits - prevWeekUsdWithdrawals
			}
		} else {
			const prevWeekCharts = chartDataByChain[chartIndex].slice(-8, -1)
			prevWeekUsdDeposits = 0
			prevWeekUsdWithdrawals = 0
			for (const chart of prevWeekCharts) {
				prevWeekUsdDeposits += chart.depositUSD
				prevWeekUsdWithdrawals += chart.withdrawUSD
			}
			prevWeekNetFlow = prevWeekUsdDeposits - prevWeekUsdWithdrawals
		}

		const topTokenDeposited = getTopTokenByUsd(totalTokensDeposited)
		const topTokenWithdrawn = getTopTokenByUsd(totalTokensWithdrawn)

		return {
			name: name,
			prevDayUsdDeposits: prevDayUsdDeposits ?? 0,
			prevDayUsdWithdrawals: prevDayUsdWithdrawals ?? 0,
			prevWeekUsdDeposits: prevWeekUsdDeposits ?? 0,
			prevWeekUsdWithdrawals: prevWeekUsdWithdrawals ?? 0,
			topTokenDepositedSymbol: topTokenDeposited.symbol,
			topTokenDepositedUsd: topTokenDeposited.usdValue,
			topTokenWithdrawnSymbol: topTokenWithdrawn.symbol,
			topTokenWithdrawnUsd: topTokenWithdrawn.usdValue,
			prevDayNetFlow: prevDayNetFlow ?? 0,
			prevWeekNetFlow: prevWeekNetFlow ?? 0
		}
	})
	return filteredChains
}

const groupTokensBySymbol = (tokens: { [token: string]: ITokenData }) => {
	const group = {}
	for (const token in tokens) {
		const symbol = tokens[token].symbol || 'Unknown'
		group[symbol] = (group[symbol] ?? 0) + (tokens[token].usdValue || 0)
	}
	return group
}

const getTopTokenByUsd = (tokens?: Record<string, ITokenData>) => {
	if (!tokens) {
		return { symbol: null, usdValue: 0 }
	}

	let topSymbol: string | null = null
	let topUsdValue = 0
	for (const key in tokens) {
		const usdValue = tokens[key]?.usdValue ?? 0
		if (topSymbol === null || usdValue > topUsdValue) {
			topSymbol = tokens[key]?.symbol ?? null
			topUsdValue = usdValue
		}
	}

	return { symbol: topSymbol, usdValue: topUsdValue }
}

const splitChainPrefixedHash = (value: string): { chain: string; hash: string } | null => {
	if (typeof value !== 'string' || value === '' || !value.includes(':')) return null
	const [chain, hash] = value.split(':')
	if (!chain || !hash) return null
	return { chain, hash }
}

export const useBuildBridgeChartData = (bridgeStatsCurrentDay: IDailyBridgeStats) => {
	const { tokenDeposits, tokenWithdrawals } = useMemo(() => {
		const tokensDeposited = bridgeStatsCurrentDay?.totalTokensDeposited
		const tokensWithdrawn = bridgeStatsCurrentDay?.totalTokensWithdrawn
		let tokenDeposits = [],
			tokenWithdrawals = []
		if (tokensDeposited && tokensWithdrawn) {
			const uniqueTokenDeposits = groupTokensBySymbol(tokensDeposited)

			tokenDeposits = preparePieChartData({
				data: uniqueTokenDeposits,
				limit: 10
			})

			const uniqueTokenWithdrawals = groupTokensBySymbol(tokensWithdrawn)

			tokenWithdrawals = preparePieChartData({
				data: uniqueTokenWithdrawals,
				limit: 10
			})
		}

		return { tokenDeposits, tokenWithdrawals }
	}, [bridgeStatsCurrentDay])
	return { tokenDeposits, tokenWithdrawals }
}

export const getBlockExplorerForTx = (txHash: string = '') => {
	const scopedHash = splitChainPrefixedHash(txHash)
	if (scopedHash) {
		const explorer = BLOCK_EXPLORERS_TXS[scopedHash.chain]
		if (explorer !== undefined) {
			return {
				blockExplorerLink: explorer[0] + scopedHash.hash,
				blockExplorerName: explorer[1]
			}
		}
		return { blockExplorerLink: null, blockExplorerName: null }
	}

	const blockExplorerLink = typeof txHash === 'string' && txHash !== '' ? 'https://etherscan.io/tx/' + txHash : null
	const blockExplorerName = blockExplorerLink ? 'Etherscan' : null

	return {
		blockExplorerLink,
		blockExplorerName
	}
}

export const getBlockExplorerForAddress = (txHash: string = '') => {
	const scopedHash = splitChainPrefixedHash(txHash)
	if (scopedHash) {
		const explorer = BLOCK_EXPLORERS_ADDRESSES[scopedHash.chain]
		const chainName = scopedHash.chain
			? scopedHash.chain
					.split('_')
					.map((x) => capitalizeFirstLetter(x))
					.join(' ')
			: 'Ethereum'

		if (explorer !== undefined) {
			return {
				blockExplorerLink: explorer[0] + scopedHash.hash,
				blockExplorerName: explorer[1],
				chainName
			}
		}

		return {
			blockExplorerLink: null,
			blockExplorerName: null,
			chainName
		}
	}

	const blockExplorerLink =
		typeof txHash === 'string' && txHash !== '' ? 'https://etherscan.io/address/' + txHash : null
	const blockExplorerName = blockExplorerLink ? 'Etherscan' : null
	const chainName = blockExplorerLink ? 'Ethereum' : null

	return {
		blockExplorerLink,
		blockExplorerName,
		chainName
	}
}
