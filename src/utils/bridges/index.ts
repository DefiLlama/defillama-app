import { useMemo } from 'react'
import { DailyBridgeStats } from '~/api/categories/bridges/utils'

export const useBuildBridgeChartData = (bridgeStatsCurrentDay: DailyBridgeStats) => {
	const { tokenDeposits, tokenWithdrawals } = useMemo(() => {
		const tokensDeposited = bridgeStatsCurrentDay?.totalTokensDeposited
		const tokensWithdrawn = bridgeStatsCurrentDay?.totalTokensWithdrawn
		let tokenDeposits = [],
			tokenWithdrawals = []
		if (tokensDeposited && tokensWithdrawn) {
			const fullTokenDeposits = Object.entries(tokensDeposited).map(([token, tokenData]) => {
				return { name: tokenData.symbol, value: tokenData.usdValue }
			})
			const otherDeposits = fullTokenDeposits.slice(10).reduce((total, entry) => {
				return (total += entry.value)
			}, 0)
			tokenDeposits = fullTokenDeposits
				.slice(0, 10)
				.sort((a, b) => b.value - a.value)
				.concat({ name: 'Others', value: otherDeposits })

			const fullTokenWithdrawals = Object.entries(tokensWithdrawn).map(([token, tokenData]) => {
				return { name: tokenData.symbol, value: tokenData.usdValue }
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
