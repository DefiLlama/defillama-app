import { describe, expect, it } from 'vitest'
import { buildLendBorrowPairs } from '../domain/lendBorrowPairs'
import { calculateLoopAPY } from '../domain/loopApy'

function makePool(overrides: Record<string, unknown>) {
	return {
		pool: 'pool',
		chain: 'Ethereum',
		project: 'euler',
		projectName: 'Euler',
		category: 'Lending',
		symbol: 'ETH',
		tvlUsd: 1_000_000,
		apy: 4,
		apyBase: 4,
		apyReward: 0,
		rewardTokens: [],
		underlyingTokens: [],
		airdrop: false,
		raiseValuation: null,
		audits: null,
		url: '',
		ltv: 0.8,
		totalBorrowUsd: 100_000,
		totalAvailableUsd: 100_000,
		borrowable: true,
		...overrides
	} as any
}

describe('Euler effective LTV handling', () => {
	it.each([
		['missing', undefined, 0.8],
		['null', null, 0.8],
		['numeric', 0.5, 0.4]
	])('uses %s borrowFactor in lend-borrow pair LTV calculations', (_label, borrowFactor, expectedLtv) => {
		const collateralPool = makePool({ pool: 'eth-collateral', symbol: 'ETH', ltv: 0.8 })
		const borrowPool = makePool({
			pool: 'usdc-borrow',
			symbol: 'USDC',
			stablecoin: true,
			apyBaseBorrow: -3,
			apyRewardBorrow: 1,
			apyBorrow: -2,
			borrowFactor
		})

		const pairs = buildLendBorrowPairs({
			pools: [collateralPool, borrowPool],
			tokenToLend: 'ETH',
			tokenToBorrow: 'USDC',
			mode: 'optimizer'
		})

		expect(pairs).toHaveLength(1)
		expect(pairs[0].ltv).toBeCloseTo(expectedLtv)
		expect(Number.isFinite(pairs[0].ltv)).toBe(true)
	})

	it.each([
		['missing', undefined, 0.8],
		['null', null, 0.8],
		['numeric', 0.5, 0.4]
	])('uses %s borrowFactor in loop APY LTV calculations', (_label, borrowFactor, expectedLtv) => {
		const [pool] = calculateLoopAPY(
			[
				makePool({
					apyBase: 4,
					apyReward: 0,
					apyBaseBorrow: -1,
					apyRewardBorrow: 0,
					borrowFactor
				})
			],
			2
		)

		expect(pool.ltv).toBeCloseTo(expectedLtv)
		expect(Number.isFinite(pool.loopApy)).toBe(true)
	})
})
