export function calculateLoopAPY(lendBorrowPools, loops = 10, customLTV) {
	let pools = lendBorrowPools.filter((p) => p.ltv > 0 && p.totalBorrowUsd > 0 && p.project !== 'marginfi') // Can't loop same asset on marginfi
	pools = pools.map((p) => ({ ...p, ltv: p.project === 'euler' ? p.ltv * p.borrowFactor : p.ltv }))

	return pools
		.map((p) => {
			const deposit_apy = (p.apyBase + p.apyReward) / 100
			// apyBaseBorrow already set to - in getLendBorrowData
			const borrow_apy = (p.apyBaseBorrow + p.apyRewardBorrow) / 100

			let total_borrowed = 0
			const ltv = customLTV ? (customLTV / 100) * p.ltv : p.ltv
			for (let i = 0; i < loops; i++) {
				total_borrowed += ltv ** (i + 1)
			}

			const loopApy = ((total_borrowed + 1) * deposit_apy + total_borrowed * borrow_apy) * 100
			const boost = loopApy / (p.apyBase + p.apyReward)
			if (boost > 1 && Number.isFinite(boost)) {
				return { ...p, loopApy, boost }
			} else return null
		})
		.filter(Boolean)
		.sort((a, b) => b.loopApy - a.loopApy)
}
