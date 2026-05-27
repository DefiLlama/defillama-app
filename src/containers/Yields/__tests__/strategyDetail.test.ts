import { describe, expect, it } from 'vitest'
import { calculateStrategyDetailLoopApy } from '~/pages/yields/strategy/[strat]'
import { calculateLoopAPY } from '../domain/loopApy'

const borrowData = {
	pool: 'euler-eth',
	chain: 'Ethereum',
	project: 'euler-v2',
	projectName: 'Euler V2',
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
	apyBaseBorrow: -1,
	apyRewardBorrow: 0,
	totalBorrowUsd: 100_000,
	borrowFactor: 0.5
}

describe('strategy detail page APY helpers', () => {
	it('passes the project into legacy loop APY rows so effective LTV logic can run', () => {
		const ltv = 0.8
		const expected = calculateLoopAPY([{ ...borrowData, ltv }], 10)[0]?.loopApy
		const actual = calculateStrategyDetailLoopApy({
			borrowData: { ...borrowData, apyBaseBorrow: 1, timestamp: 1_700_000_000 },
			project: 'euler-v2',
			ltv
		})

		expect(actual).toBeCloseTo(expected!)
	})
})
