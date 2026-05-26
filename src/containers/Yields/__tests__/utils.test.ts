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

describe('toFilterPool route defaults', () => {
	it('/yields excludes pools with APY <= 0 unless apy_zero is selected', () => {
		expect(matchesPool({ apy: 0 }, {})).toBe(false)
		expect(matchesPool({ apy: -1 }, {})).toBe(false)
		expect(matchesPool({ apy: 0.01 }, {})).toBe(true)

		expect(matchesPool({ apy: 0 }, { selectedAttributes: ['apy_zero'] })).toBe(true)
		expect(matchesPool({ apy: -1 }, { selectedAttributes: ['apy_zero'] })).toBe(false)
	})

	it('/yields/stablecoins defaults to stablecoin pools with no impermanent loss', () => {
		expect(matchesPool({ stablecoin: true, ilRisk: 'no' }, { pathname: '/yields/stablecoins' })).toBe(true)
		expect(matchesPool({ stablecoin: false, ilRisk: 'no' }, { pathname: '/yields/stablecoins' })).toBe(false)
		expect(matchesPool({ stablecoin: true, ilRisk: 'yes' }, { pathname: '/yields/stablecoins' })).toBe(false)
	})

	it('treats TVL bounds as inclusive and APY bounds as exclusive', () => {
		expect(matchesPool({ tvlUsd: 999 }, { minTvl: 1_000, maxTvl: 2_000 })).toBe(false)
		expect(matchesPool({ tvlUsd: 1_000 }, { minTvl: 1_000, maxTvl: 2_000 })).toBe(true)
		expect(matchesPool({ tvlUsd: 2_000 }, { minTvl: 1_000, maxTvl: 2_000 })).toBe(true)
		expect(matchesPool({ tvlUsd: 2_001 }, { minTvl: 1_000, maxTvl: 2_000 })).toBe(false)

		expect(matchesPool({ apy: 5 }, { minApy: 5, maxApy: 10 })).toBe(false)
		expect(matchesPool({ apy: 5.01 }, { minApy: 5, maxApy: 10 })).toBe(true)
		expect(matchesPool({ apy: 9.99 }, { minApy: 5, maxApy: 10 })).toBe(true)
		expect(matchesPool({ apy: 10 }, { minApy: 5, maxApy: 10 })).toBe(false)
	})
})

describe('toFilterPool token filters', () => {
	it('keeps broad include-token substring matching, including ETH matching WETH and stETH', () => {
		expect(matchesPool({ symbol: 'WETH-USDC' }, { includeTokens: ['eth'] })).toBe(true)
		expect(matchesPool({ symbol: 'STETH-USDC' }, { includeTokens: ['eth'] })).toBe(true)
		expect(matchesPool({ symbol: 'LINK-USDC' }, { includeTokens: ['in'] })).toBe(true)
		expect(matchesPool({ symbol: 'LINK-USDC' }, { includeTokens: ['eth'] })).toBe(false)
	})

	it('keeps exact-token matching stricter than include-token matching', () => {
		expect(matchesPool({ symbol: 'ETH-USDC' }, { exactTokens: ['eth'] })).toBe(true)
		expect(matchesPool({ symbol: 'WETH-USDC' }, { exactTokens: ['eth'] })).toBe(false)
		expect(matchesPool({ symbol: 'STETH-USDC' }, { exactTokens: ['eth'] })).toBe(false)
		expect(matchesPool({ symbol: 'LINK-USDC' }, { exactTokens: ['in'] })).toBe(false)
	})

	it('keeps exclude-token matching exact instead of substring-based', () => {
		expect(matchesPool({ symbol: 'ETH-USDC' }, { excludeTokensSet: new Set(['eth']) })).toBe(false)
		expect(matchesPool({ symbol: 'WETH-USDC' }, { excludeTokensSet: new Set(['eth']) })).toBe(true)
		expect(matchesPool({ symbol: 'STETH-USDC' }, { excludeTokensSet: new Set(['eth']) })).toBe(true)
		expect(matchesPool({ symbol: 'LINK-USDC' }, { excludeTokensSet: new Set(['in']) })).toBe(true)
	})

	it('matches ALL_USD_STABLES only for stablecoin pools whose tokens are USD-pegged', () => {
		const filter = { includeTokens: ['all_usd_stables'], usdPeggedSymbols: ['USDC', 'USDT', 'DAI'] }

		expect(matchesPool({ symbol: 'USDC-USDT', stablecoin: true }, filter)).toBe(true)
		expect(matchesPool({ symbol: 'USDC-USDT', stablecoin: false }, filter)).toBe(false)
		expect(matchesPool({ symbol: 'USDC-EURC', stablecoin: true }, filter)).toBe(false)
	})

	it('matches ALL_BITCOINS by the current broad btc substring behavior', () => {
		const filter = { includeTokens: ['all_bitcoins'] }

		expect(matchesPool({ symbol: 'WBTC-USDC' }, filter)).toBe(true)
		expect(matchesPool({ symbol: 'cbBTC-USDC' }, filter)).toBe(true)
		expect(matchesPool({ symbol: 'BTCB-USDC' }, filter)).toBe(true)
		expect(matchesPool({ symbol: 'ETH-USDC' }, filter)).toBe(false)
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

	it('matches the same pair token set regardless of order but rejects pools with extra tokens', () => {
		expect(matchesPool({ symbol: 'ETH-USDC' }, { pairTokens: ['usdc-eth'] })).toBe(true)
		expect(matchesPool({ symbol: 'USDC-ETH' }, { pairTokens: ['usdc-eth'] })).toBe(true)
		expect(matchesPool({ symbol: 'USDC-ETH-DAI' }, { pairTokens: ['usdc-eth'] })).toBe(false)
	})

	it('lets pair-token filtering take precedence over include, exclude, and exact token filters', () => {
		expect(
			matchesPool(
				{ symbol: 'ETH-USDC' },
				{
					pairTokens: ['eth-usdc'],
					includeTokens: ['btc'],
					excludeTokensSet: new Set(['eth']),
					exactTokens: ['btc']
				}
			)
		).toBe(true)
		expect(matchesPool({ symbol: 'ETH-USDC' }, { pairTokens: ['btc-usdc'], includeTokens: ['eth'] })).toBe(false)
	})
})
