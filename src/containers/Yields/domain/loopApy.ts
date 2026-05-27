import { sumApyParts } from './apyMath'
import { applyCustomLtvToMax, getEffectiveLtv } from './ltv'

export interface LoopApyInputPool {
	project: string
	ltv?: number | null
	borrowFactor?: number | null
	totalBorrowUsd?: number | null
	apyBase?: number | null
	apyReward?: number | null
	apyBaseBorrow?: number | null
	apyRewardBorrow?: number | null
}

export type LoopApyPool<TPool extends LoopApyInputPool = LoopApyInputPool> = TPool & {
	ltv: number
	loopApy: number
	boost: number
}

export function calculateLoopAPY<TPool extends LoopApyInputPool>(
	lendBorrowPools: TPool[],
	loops = 10,
	customLTV?: number | null
): Array<LoopApyPool<TPool>> {
	const rows: Array<LoopApyPool<TPool>> = []

	for (const pool of lendBorrowPools) {
		// Can't loop same asset on marginfi.
		if (pool.ltv == null || pool.ltv <= 0 || (pool.totalBorrowUsd ?? 0) <= 0 || pool.project === 'marginfi') continue

		const effectiveLtv = getEffectiveLtv({
			project: pool.project,
			ltv: pool.ltv,
			borrowFactor: pool.borrowFactor
		})
		if (effectiveLtv == null || effectiveLtv <= 0) continue

		const depositApy = (sumApyParts(pool.apyBase, pool.apyReward) ?? 0) / 100
		// apyBaseBorrow already set to - in getLendBorrowData
		const borrowApy = (sumApyParts(pool.apyBaseBorrow, pool.apyRewardBorrow) ?? 0) / 100

		let totalBorrowed = 0
		const ltv = applyCustomLtvToMax(effectiveLtv, customLTV)
		for (let i = 0; i < loops; i++) {
			totalBorrowed += ltv ** (i + 1)
		}

		const loopApy = ((totalBorrowed + 1) * depositApy + totalBorrowed * borrowApy) * 100
		const boost = loopApy / (sumApyParts(pool.apyBase, pool.apyReward) ?? 0)
		if (boost > 1 && Number.isFinite(boost)) {
			rows.push({ ...pool, ltv: effectiveLtv, loopApy, boost })
		}
	}

	rows.sort((a, b) => b.loopApy - a.loopApy)
	return rows
}
