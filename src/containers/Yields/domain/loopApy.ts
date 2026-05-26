import type { LendBorrowPool } from '../types'
import { sumApyParts } from './apyMath'
import { applyCustomLtvToMax, getEffectiveLtv } from './ltv'

export interface LoopApyPool extends LendBorrowPool {
	ltv: number
	loopApy: number
	boost: number
}

export function calculateLoopAPY(lendBorrowPools: LendBorrowPool[], loops = 10, customLTV?: number | null) {
	const pools = lendBorrowPools
		.filter((p) => p.ltv != null && p.ltv > 0 && (p.totalBorrowUsd ?? 0) > 0 && p.project !== 'marginfi') // Can't loop same asset on marginfi
		.map((p) => ({
			...p,
			ltv: getEffectiveLtv({ project: p.project, ltv: p.ltv, borrowFactor: p.borrowFactor })
		}))
		.filter((p): p is LendBorrowPool & { ltv: number } => p.ltv != null && p.ltv > 0)

	return pools
		.map((p) => {
			const deposit_apy = (sumApyParts(p.apyBase, p.apyReward) ?? 0) / 100
			// apyBaseBorrow already set to - in getLendBorrowData
			const borrow_apy = (sumApyParts(p.apyBaseBorrow, p.apyRewardBorrow) ?? 0) / 100

			let total_borrowed = 0
			const ltv = applyCustomLtvToMax(p.ltv, customLTV)
			for (let i = 0; i < loops; i++) {
				total_borrowed += ltv ** (i + 1)
			}

			const loopApy = ((total_borrowed + 1) * deposit_apy + total_borrowed * borrow_apy) * 100
			const boost = loopApy / (sumApyParts(p.apyBase, p.apyReward) ?? 0)
			if (boost > 1 && Number.isFinite(boost)) {
				return { ...p, loopApy, boost }
			} else return null
		})
		.filter((p): p is LoopApyPool => p != null)
		.sort((a, b) => b.loopApy - a.loopApy)
}
