import { describe, expect, it } from 'vitest'
import { buildYieldPoolsPageResponse } from '../pools.server'
import type { YieldPageProps, YieldPool } from '../types'

function pool(id: string, overrides: Partial<YieldPool> = {}): YieldPool {
	return {
		pool: id,
		symbol: `${id.toUpperCase()}-USDC`,
		project: 'project-a',
		projectName: 'Project A',
		chain: 'Ethereum',
		category: 'Dexes',
		tvlUsd: 1_000,
		apy: 5,
		apyBase: 4,
		apyReward: 1,
		rewardTokens: [],
		underlyingTokens: [],
		airdrop: false,
		raiseValuation: null,
		audits: '1',
		url: '',
		stablecoin: false,
		ilRisk: 'yes',
		exposure: 'multi',
		outlier: false,
		predictions: { predictedClass: 'Stable/Up', binnedConfidence: 3 },
		...overrides
	}
}

function pageData(pools: YieldPool[]): YieldPageProps {
	return {
		pools,
		chainList: ['Ethereum', 'Base'],
		projectList: ['Project A', 'Project B'],
		categoryList: ['Dexes', 'Lending'],
		tokenNameMapping: {},
		tokens: [],
		tokenSymbolsList: [],
		usdPeggedSymbols: ['USDC', 'USDT', 'DAI'],
		stablecoinInfoBySymbol: {
			usdc: { price: 1.001, pegDeviation: 0.1 },
			usdt: { price: 0.999, pegDeviation: -0.1 }
		},
		tokenCategories: {},
		evmChains: ['Ethereum', 'Base']
	}
}

describe('buildYieldPoolsPageResponse', () => {
	it('defaults to main Yields filtering and keeps stablecoins view defaults explicit', () => {
		const data = pageData([
			pool('active', { symbol: 'ETH-USDC', apy: 5 }),
			pool('zero', { symbol: 'ZERO-USDC', apy: 0 }),
			pool('stable', { symbol: 'USDC-USDT', apy: 2, stablecoin: true, ilRisk: 'no' }),
			pool('stable-il', { symbol: 'USDC-DAI', apy: 3, stablecoin: true, ilRisk: 'yes' })
		])

		expect(buildYieldPoolsPageResponse({ data, query: {} }).rows.map((row) => row.configID)).toEqual([
			'active',
			'stable',
			'stable-il'
		])
		expect(
			buildYieldPoolsPageResponse({ data, query: { view: 'stablecoins' } }).rows.map((row) => row.configID)
		).toEqual(['stable'])
	})

	it('decodes pool filter query params before filtering', () => {
		const data = pageData([
			pool('eth-base-lending', {
				symbol: 'WETH-USDC',
				project: 'project-b',
				projectName: 'Project B',
				chain: 'Base',
				category: 'Lending'
			}),
			pool('btc-base-lending', {
				symbol: 'WBTC-USDC',
				project: 'project-b',
				projectName: 'Project B',
				chain: 'Base',
				category: 'Lending'
			}),
			pool('eth-ethereum-dex', { symbol: 'WETH-USDC' })
		])

		const result = buildYieldPoolsPageResponse({
			data,
			query: {
				project: 'Project B',
				chain: 'Base',
				category: 'Lending',
				token: 'ETH'
			}
		})

		expect(result.rows.map((row) => row.configID)).toEqual(['eth-base-lending'])
	})

	it('returns the requested page window and total count', () => {
		const data = pageData([pool('pool-1'), pool('pool-2'), pool('pool-3'), pool('pool-4'), pool('pool-5')])

		const result = buildYieldPoolsPageResponse({
			data,
			query: {
				page: '2',
				pageSize: '2'
			}
		})

		expect(result).toMatchObject({
			total: 5,
			page: 2,
			pageSize: 2,
			hasMore: true
		})
		expect(result.rows.map((row) => row.configID)).toEqual(['pool-3', 'pool-4'])
	})

	it('sorts stably with missing values last', () => {
		const data = pageData([
			pool('first', { apyBase: 8 }),
			pool('tie-a', { apyBase: 10 }),
			pool('missing', { apyBase: null }),
			pool('tie-b', { apyBase: 10 }),
			pool('low', { apyBase: 1 })
		])

		const result = buildYieldPoolsPageResponse({
			data,
			query: {
				sortBy: 'apyBase',
				sortDesc: 'true'
			}
		})

		expect(result.rows.map((row) => row.configID)).toEqual(['tie-a', 'tie-b', 'first', 'low', 'missing'])
	})

	it('keeps token and range semantics through the server query path', () => {
		const data = pageData([
			pool('eth-usdc', { symbol: 'ETH-USDC', tvlUsd: 1_000, apy: 5 }),
			pool('weth-usdc', { symbol: 'WETH-USDC', tvlUsd: 1_000, apy: 5 }),
			pool('steth-usdc', { symbol: 'STETH-USDC', tvlUsd: 1_000, apy: 5 }),
			pool('eth-dai', { symbol: 'ETH-DAI', tvlUsd: 1_000, apy: 5 }),
			pool('eth-usdc-low-apy', { symbol: 'ETH-USDC', tvlUsd: 1_000, apy: 5 })
		])

		expect(buildYieldPoolsPageResponse({ data, query: { token: 'ETH' } }).rows.map((row) => row.configID)).toEqual([
			'eth-usdc',
			'weth-usdc',
			'steth-usdc',
			'eth-dai',
			'eth-usdc-low-apy'
		])
		expect(buildYieldPoolsPageResponse({ data, query: { exactToken: 'ETH' } }).rows.map((row) => row.configID)).toEqual(
			['eth-usdc', 'eth-dai', 'eth-usdc-low-apy']
		)
		expect(
			buildYieldPoolsPageResponse({ data, query: { excludeToken: 'ETH' } }).rows.map((row) => row.configID)
		).toEqual(['weth-usdc', 'steth-usdc'])
		expect(
			buildYieldPoolsPageResponse({
				data,
				query: { token_pair: 'eth-usdc', token: 'BTC', excludeToken: 'ETH', exactToken: 'BTC' }
			}).rows.map((row) => row.configID)
		).toEqual(['eth-usdc', 'weth-usdc', 'eth-usdc-low-apy'])
		expect(
			buildYieldPoolsPageResponse({
				data,
				query: { minTvl: '1000', maxTvl: '1000', minApy: '5', attribute: 'apy_zero' }
			}).rows.map((row) => row.configID)
		).toEqual([])
	})

	it('adds main page borrow and stablecoin peg enrichments before row shaping', () => {
		const data = pageData([pool('pool-1', { symbol: 'USDC-USDT' })])
		const result = buildYieldPoolsPageResponse({
			data,
			lendBorrowPools: [
				{
					...pool('pool-1'),
					apyBaseBorrow: -1,
					apyRewardBorrow: 0.25,
					apyBorrow: -0.75,
					totalSupplyUsd: 10_000,
					totalBorrowUsd: 4_000,
					totalAvailableUsd: 6_000,
					ltv: 0.75
				}
			],
			query: {}
		})

		expect(result.rows[0]).toMatchObject({
			apyBaseBorrow: -1,
			apyRewardBorrow: 0.25,
			apyBorrow: -0.75,
			totalSupplyUsd: 10_000,
			totalBorrowUsd: 4_000,
			totalAvailableUsd: 6_000,
			ltv: 0.75,
			pegDeviation: 0.1,
			pegPrice: 1.001
		})
	})
})
