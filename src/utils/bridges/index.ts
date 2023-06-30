import { useMemo } from 'react'
import { DailyBridgeStats } from '~/api/categories/bridges/utils'

export const useBuildBridgeChartData = (bridgeStatsCurrentDay: DailyBridgeStats) => {
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
