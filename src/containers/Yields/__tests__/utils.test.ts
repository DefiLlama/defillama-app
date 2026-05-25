import { describe, expect, it } from 'vitest'
import { toFilterPool } from '../utils'

const tokenCategories = {
	gold: {
		addresses: ['ethereum:0xgold'],
		symbols: ['xaut'],
		label: 'Tokenized Gold',
		filterKey: 'TOKENIZED_GOLD'
	}
}

const basePool = {
	pool: 'pool-1',
	symbol: 'XAUT-USDC',
	project: 'test-project',
	projectName: 'Test Project',
	chain: 'Ethereum',
	category: 'Dexes',
	tvlUsd: 1_000,
	apy: 5,
	stablecoin: false,
	underlyingTokens: []
} as any

function matchesPool(poolOverrides: Record<string, unknown>, filterOverrides: Record<string, unknown>) {
	return Boolean(
		toFilterPool({
			curr: { ...basePool, ...poolOverrides },
			selectedProjectsSet: new Set(['Test Project']),
			selectedChainsSet: new Set(['Ethereum']),
			selectedAttributes: [],
			includeTokens: [],
			excludeTokensSet: new Set(),
			exactTokens: [],
			selectedCategoriesSet: new Set(['Dexes']),
			pathname: '/yields',
			minTvl: null,
			maxTvl: null,
			minApy: null,
			maxApy: null,
			pairTokens: [],
			usdPeggedSymbols: [],
			tokenCategories,
			...filterOverrides
		})
	)
}

describe('toFilterPool token categories', () => {
	it('uses category symbols only when a pool has no underlying token addresses', () => {
		expect(matchesPool({ underlyingTokens: [] }, { includeTokens: ['tokenized_gold'] })).toBe(true)
		expect(matchesPool({ underlyingTokens: ['0xnot-gold', '0xusdc'] }, { includeTokens: ['tokenized_gold'] })).toBe(
			false
		)
		expect(matchesPool({ underlyingTokens: ['0xgold', '0xusdc'] }, { includeTokens: ['tokenized_gold'] })).toBe(true)
	})

	it('matches category pair parts against the assigned pool token only', () => {
		expect(matchesPool({ underlyingTokens: [] }, { pairTokens: ['tokenized_gold-usdc'] })).toBe(true)
		expect(matchesPool({ underlyingTokens: [] }, { pairTokens: ['tokenized_gold-xaut'] })).toBe(false)
	})
})

describe('toFilterPool token pairs', () => {
	it('matches normal pair parts exactly instead of by substring', () => {
		expect(matchesPool({ symbol: 'ETH-USDC' }, { pairTokens: ['eth-usdc'] })).toBe(true)
		expect(matchesPool({ symbol: 'WETH-USDC' }, { pairTokens: ['eth-usdc'] })).toBe(true)
		expect(matchesPool({ symbol: 'STETH-USDC' }, { pairTokens: ['eth-usdc'] })).toBe(false)
		expect(matchesPool({ symbol: 'LINK-USDC' }, { pairTokens: ['in-usdc'] })).toBe(false)
	})

	it('matches wrapped token aliases with broad pair categories', () => {
		expect(
			matchesPool({ symbol: 'USDC-WSTETH' }, { pairTokens: ['all_usd_stables-steth'], usdPeggedSymbols: ['USDC'] })
		).toBe(true)
	})
})
