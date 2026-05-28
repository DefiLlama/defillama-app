import { describe, expect, it } from 'vitest'
import { filterOptimizerPool, filterStrategyPool, formatOptimizerPool } from '../domain/strategyFilters'

const basePool = {
	chain: 'Ethereum',
	project: 'aave-v3',
	projectName: 'Aave V3',
	tvlUsd: 1_000,
	apy: 1,
	ltv: 0.8,
	borrow: {
		totalAvailableUsd: 500,
		apyBaseBorrow: -3,
		apyRewardBorrow: 1
	},
	apyBase: 2,
	apyReward: 1,
	stablecoin: false
} as any

const selectedChainsSet = new Set(['Ethereum'])

describe('strategy and optimizer filters', () => {
	it('rejects custom LTV 0 while keeping null and valid strategy values', () => {
		expect(filterStrategyPool({ pool: basePool, selectedChainsSet, customLTV: null })).toBe(true)
		expect(filterStrategyPool({ pool: basePool, selectedChainsSet, customLTV: 0 })).toBe(false)
		expect(filterStrategyPool({ pool: basePool, selectedChainsSet, customLTV: 50 })).toBe(true)
		expect(filterStrategyPool({ pool: basePool, selectedChainsSet, customLTV: 100 })).toBe(true)
		expect(filterStrategyPool({ pool: basePool, selectedChainsSet, customLTV: 101 })).toBe(false)
	})

	it('rejects optimizer custom LTV values at 0, at 100, or above the collateral max LTV', () => {
		expect(filterOptimizerPool({ pool: basePool, selectedChainsSet, customLTV: null })).toBe(true)
		expect(filterOptimizerPool({ pool: basePool, selectedChainsSet, customLTV: 0 })).toBe(false)
		expect(filterOptimizerPool({ pool: basePool, selectedChainsSet, customLTV: 50 })).toBe(true)
		expect(filterOptimizerPool({ pool: basePool, selectedChainsSet, customLTV: 80 })).toBe(true)
		expect(filterOptimizerPool({ pool: basePool, selectedChainsSet, customLTV: 81 })).toBe(false)
		expect(filterOptimizerPool({ pool: basePool, selectedChainsSet, customLTV: 100 })).toBe(false)
	})

	it('uses farm TVL consistently for strategy min and max filters', () => {
		const pool = { ...basePool, tvlUsd: 1_000, farmTvlUsd: 200 }

		expect(filterStrategyPool({ pool, selectedChainsSet, minTvl: 100, maxTvl: 300 })).toBe(true)
		expect(filterStrategyPool({ pool, selectedChainsSet, minTvl: 300 })).toBe(false)
		expect(filterStrategyPool({ pool, selectedChainsSet, maxTvl: 150 })).toBe(false)
	})

	it('uses collateral TVL for optimizer min and max filters', () => {
		const pool = { ...basePool, tvlUsd: 1_000, farmTvlUsd: 200 }

		expect(filterOptimizerPool({ pool, selectedChainsSet, minTvl: 900, maxTvl: 1_100 })).toBe(true)
		expect(filterOptimizerPool({ pool, selectedChainsSet, maxTvl: 300 })).toBe(false)
		expect(filterOptimizerPool({ pool, selectedChainsSet, minTvl: 1_100 })).toBe(false)
	})

	it('calculates optimizer rows with custom LTV 0 instead of treating it as no override', () => {
		const row = formatOptimizerPool({ pool: basePool, customLTV: 0 })

		expect(row.totalBase).toBe(2)
		expect(row.totalReward).toBe(3)
		expect(row.borrowReward).toBe(-2)
	})
})
