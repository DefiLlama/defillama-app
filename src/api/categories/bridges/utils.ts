import { getPercentChange, getPrevVolumeFromChart } from '~/utils'
import { keepNeededProperties } from '../../shared'

export type DailyBridgeStats = {
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
		filteredBridges = filteredBridges.filter(({ chains = [] }) => chains.includes(chain))
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
		bridge.lastDailyVolume = bridge.last24hVolume

		return keepNeededProperties(bridge, bridgeProps)
	})

	filteredBridges = filteredBridges.sort((a, b) => b.lastDailyVolume - a.lastDailyVolume)

	return filteredBridges
}

export const formatChainsData = ({
	chains = [],
	chartDataByChain = [],
	chainToChartDataIndex = {},
	prevDayDataByChain = [] as DailyBridgeStats[]
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
		const prevDayUsdDeposits = prevDayChart?.depositUSD
		const prevDayUsdWithdrawals = prevDayChart?.withdrawUSD
		const totalTokensDeposited = prevDayData?.totalTokensDeposited
		const totalTokensWithdrawn = prevDayData?.totalTokensWithdrawn
		const prevDayNetFlow = prevDayUsdDeposits - prevDayUsdWithdrawals

		const prevWeekCharts = chartDataByChain[chartIndex].slice(-8, -1)
		let prevWeekUsdDeposits = 0
		let prevWeekUsdWithdrawals = 0
		for (const chart of prevWeekCharts) {
			prevWeekUsdDeposits += chart.depositUSD
			prevWeekUsdWithdrawals += chart.withdrawUSD
		}
		const prevWeekNetFlow = prevWeekUsdWithdrawals - prevWeekUsdDeposits

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
