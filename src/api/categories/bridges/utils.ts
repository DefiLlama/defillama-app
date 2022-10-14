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
}

export const bridgePropertiesToKeep = [
	'displayName',
	'name',
	'symbol',
	'chains',
	'volumePrevDay',
	'volumePrev2Day',
	'volumePrevWeek',
	'volumePrevMonth',
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

		bridge.volumePrevDay = getPrevVolumeFromChart(chart, 0) ?? null
		bridge.volumePrev2Day = getPrevVolumeFromChart(chart, 1) ?? null
		bridge.volumePrevWeek = getPrevVolumeFromChart(chart, 7) ?? null
		bridge.volumePrevMonth = getPrevVolumeFromChart(chart, 30) ?? null
		bridge.change_1d = getPercentChange(bridge.volumePrevDay, bridge.volumePrev2Day)
		bridge.change_7d = getPercentChange(bridge.volumePrevDay, bridge.volumePrevWeek)
		bridge.change_1m = getPercentChange(bridge.volumePrevDay, bridge.volumePrevMonth)
		bridge.txsPrevDay = getPrevVolumeFromChart(chart, 0, true) ?? null

		return keepNeededProperties(bridge, bridgeProps)
	})

	filteredBridges = filteredBridges.sort((a, b) => b.volumePrevDay - a.volumePrevDay)

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
		const prevDayData = prevDayDataByChain[chartIndex] ?? null
		const prevDayChart = charts?.[charts.length - 1]
		const prevDayUsdDeposits = prevDayChart?.depositUSD
		const prevDayUsdWithdrawals = prevDayChart?.withdrawUSD
		const totalTokensDeposited = prevDayData?.totalTokensDeposited
		const totalTokensWithdrawn = prevDayData?.totalTokensWithdrawn
		const netFlow = prevDayUsdWithdrawals - prevDayUsdDeposits

		let topTokenDepositedSymbol = null,
			topTokenWithdrawnSymbol = null,
			topTokenDepositedUsd = 0,
			topTokenWithdrawnUsd = 0
		if (Object.keys(totalTokensDeposited)?.length) {
			const topTokenDeposited = Object.entries(totalTokensDeposited)
				.sort((a, b) => {
					return b[1].usdValue - a[1].usdValue
				})
				.slice(0, 1)[0]
			const topDepositTokenData = topTokenDeposited[1]
			topTokenDepositedSymbol = topDepositTokenData.symbol
			topTokenDepositedUsd = topDepositTokenData.usdValue
		}
		if (Object.keys(totalTokensWithdrawn)?.length) {
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
			topTokenDepositedSymbol: topTokenDepositedSymbol,
			topTokenDepositedUsd: topTokenDepositedUsd,
			topTokenWithdrawnSymbol: topTokenWithdrawnSymbol,
			topTokenWithdrawnUsd: topTokenWithdrawnUsd,
			netFlow: netFlow ?? 0
		}
	})
	return filteredChains
}
