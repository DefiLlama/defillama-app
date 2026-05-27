import { describe, expect, it } from 'vitest'
import { buildYieldHalalPageMetadata, buildYieldHalalPageResponse } from '../halalTable.server'
import { buildYieldLongShortPageMetadata, buildYieldLongShortPageResponse } from '../longShortTable.server'
import { buildYieldLoopPageMetadata, buildYieldLoopPageResponse } from '../loopTable.server'
import { buildYieldStrategyPageMetadata, buildYieldStrategyPageResponse } from '../strategyTable.server'
import type { LendBorrowData, LendBorrowPool, YieldPageData, YieldPool } from '../types'

function pool(id: string, overrides: Partial<YieldPool> = {}): YieldPool {
	return {
		pool: id,
		symbol: `${id.toUpperCase()}-USDC`,
		project: 'curve',
		projectName: 'Curve',
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
		ilRisk: 'no',
		exposure: 'single',
		outlier: false,
		predictions: { predictedClass: 'Stable/Up', binnedConfidence: 3 },
		...overrides
	}
}

function lendPool(id: string, overrides: Partial<LendBorrowPool> = {}): LendBorrowPool {
	return {
		...pool(id, {
			category: 'Lending',
			project: 'aave-v3',
			projectName: 'Aave V3',
			...overrides
		}),
		apyBaseBorrow: -3,
		apyRewardBorrow: 1,
		apyBorrow: -2,
		totalSupplyUsd: 10_000,
		totalBorrowUsd: 2_000,
		totalAvailableUsd: 8_000,
		ltv: 0.5,
		borrowable: true,
		...overrides
	}
}

function lendBorrowData(pools: LendBorrowPool[], allPools: YieldPool[] = pools): LendBorrowData {
	return {
		props: {
			pools,
			allPools,
			chainList: ['Ethereum', 'Base'],
			projectList: ['Aave V3', 'Curve', 'Farm One', 'Farm Two'],
			lendingProtocols: ['Aave V3'],
			farmProtocols: ['Curve', 'Farm One', 'Farm Two'],
			categoryList: ['Lending', 'CDP', 'NFT Lending'],
			tokenNameMapping: {},
			symbols: ['ETH', 'USDC', 'WBTC'],
			evmChains: ['Ethereum', 'Base']
		}
	}
}

function pageData(pools: YieldPool[]): YieldPageData {
	return {
		props: {
			pools,
			chainList: ['Ethereum', 'Base'],
			projectList: ['Curve', 'Aave V3', 'Uniswap V3'],
			categoryList: ['Dexes', 'Lending'],
			tokenNameMapping: {},
			tokens: [],
			tokenSymbolsList: [],
			usdPeggedSymbols: ['USDC', 'USDT', 'DAI'],
			stablecoinInfoBySymbol: {
				usdc: { price: 1.001, pegDeviation: 0.1 }
			},
			tokenCategories: {},
			evmChains: ['Ethereum', 'Base']
		}
	}
}

const cgList = [
	{ name: 'Ethereum', symbol: 'eth', image: 'eth.png', image2: 'eth2.png' },
	{ name: 'USD Coin', symbol: 'usdc', image: 'usdc.png', image2: null }
] as any

describe('route-specific Yields table builders', () => {
	it('builds loop metadata without pools and returns paginated loop rows with existing token filters', () => {
		const data = lendBorrowData([
			lendPool('eth-loop', { symbol: 'ETH', apyBase: 6, apyReward: 0, apyBorrow: -1, totalBorrowUsd: 4_000 }),
			lendPool('btc-loop', { symbol: 'WBTC', apyBase: 4, apyReward: 0, apyBorrow: -2, totalBorrowUsd: 4_000 })
		])

		const metadata = buildYieldLoopPageMetadata(data, cgList)
		expect(metadata).not.toHaveProperty('pools')
		expect(metadata.tokens.map((token) => token.symbol)).toEqual(['ETH', 'USDC'])

		const result = buildYieldLoopPageResponse(data, {
			token: 'ETH',
			page: '1',
			pageSize: '1'
		})

		expect(result).toMatchObject({ total: 1, page: 1, pageSize: 1, hasMore: false })
		expect(result.rows[0]).toMatchObject({
			configID: 'eth-loop',
			netSupplyApy: 6
		})
		expect(result.rows[0].loopApy).toBeGreaterThan(6)
		expect(result.rows[0].boost).toBeGreaterThan(1)
	})

	it('builds strategy rows server-side while preserving filters, pagination, sorting, and APY math', () => {
		const collateral = lendPool('eth-collateral', {
			symbol: 'ETH',
			apy: 2,
			apyBase: 2,
			apyReward: 0,
			apyBorrow: -2,
			totalSupplyUsd: 10_000,
			totalBorrowUsd: 2_000,
			totalAvailableUsd: 8_000
		})
		const borrow = lendPool('usdc-borrow', {
			symbol: 'USDC',
			apy: 1,
			apyBase: 1,
			apyReward: 0,
			apyBorrow: -1,
			totalSupplyUsd: 20_000,
			totalBorrowUsd: 5_000,
			totalAvailableUsd: 15_000
		})
		const farmOne = pool('farm-one', {
			symbol: 'USDC',
			project: 'farm-one',
			projectName: 'Farm One',
			apy: 10,
			tvlUsd: 2_000
		})
		const farmTwo = pool('farm-two', {
			symbol: 'USDC',
			project: 'farm-two',
			projectName: 'Farm Two',
			apy: 8,
			tvlUsd: 3_000
		})
		const data = lendBorrowData([collateral, borrow], [collateral, borrow, farmOne, farmTwo])

		const metadata = buildYieldStrategyPageMetadata(data, cgList)
		expect(metadata).not.toHaveProperty('pools')
		expect(metadata).not.toHaveProperty('allPools')

		const result = buildYieldStrategyPageResponse(data, {
			lend: 'ETH',
			borrow: 'USDC',
			farmProtocol: 'Farm Two',
			sortBy: 'farmTvlUsd',
			sortDesc: 'false',
			page: '1',
			pageSize: '1'
		})

		expect(result).toMatchObject({ total: 1, page: 1, pageSize: 1, hasMore: false })
		expect(result.rows[0]).toMatchObject({
			symbol: 'ETH',
			farmSymbol: 'USDC',
			farmProjectName: 'Farm Two',
			farmTvlUsd: 3_000,
			borrowAvailableUsd: 15_000,
			totalApy: 5.5,
			delta: 3.5
		})
	})

	it('builds long/short rows with token semantics, route math, and default open-interest ordering', () => {
		const data = pageData([
			pool('btc-farm', { symbol: 'BTC', project: 'farm-one', projectName: 'Farm One', apy: 5, tvlUsd: 5_000 })
		])
		const perps = [
			{
				symbol: 'BTC',
				baseAsset: 'BTC',
				market: 'BTC-PERP-A',
				marketplace: 'Exchange A',
				fundingRate: 0.001,
				fundingRatePrevious: 0.001,
				fundingRate7dAverage: 0.001,
				fundingRate7dSum: 0.007,
				fundingRate30dAverage: 0.001,
				fundingRate30dSum: 0.03,
				openInterest: 100,
				indexPrice: 20_000
			},
			{
				symbol: 'BTC',
				baseAsset: 'BTC',
				market: 'BTC-PERP-B',
				marketplace: 'Exchange B',
				fundingRate: 0.001,
				fundingRatePrevious: 0.0005,
				fundingRate7dAverage: 0.001,
				fundingRate7dSum: 0.007,
				fundingRate30dAverage: 0.001,
				fundingRate30dSum: 0.03,
				openInterest: 200,
				indexPrice: 20_000
			}
		]

		const metadata = buildYieldLongShortPageMetadata(data, [
			...cgList,
			{ name: 'Bitcoin', symbol: 'btc', image: 'btc.png', image2: null }
		] as any)
		expect(metadata).not.toHaveProperty('filteredPools')
		expect(metadata.tokens.map((token) => token.symbol)).toEqual(['BTC'])

		const result = buildYieldLongShortPageResponse({
			data,
			perps,
			query: { token: 'BTC' }
		})

		expect(result.rows.map((row) => row.symbolPerp)).toEqual(['BTC-PERP-B', 'BTC-PERP-A'])
		expect(result.rows[0]).toMatchObject({
			symbol: 'BTC',
			marketplace: 'Exchange B',
			openInterest: 200
		})
		expect(result.rows[0].strategyAPY).toBeCloseTo(59.75)
		expect(result.rows[0].afr).toBeCloseTo(54.75)
	})

	it('sorts long/short funding-rate string columns numerically', () => {
		const data = pageData([
			pool('btc-farm', { symbol: 'BTC', project: 'farm-one', projectName: 'Farm One', apy: 5, tvlUsd: 5_000 })
		])
		const perps = [
			{
				symbol: 'BTC',
				baseAsset: 'BTC',
				market: 'BTC-PERP-2',
				marketplace: 'Exchange B',
				fundingRate: 0.02,
				fundingRatePrevious: 0.001,
				fundingRate7dAverage: 0.02,
				fundingRate7dSum: 0.14,
				fundingRate30dAverage: 0.02,
				fundingRate30dSum: 0.6,
				openInterest: 200,
				indexPrice: 20_000
			},
			{
				symbol: 'BTC',
				baseAsset: 'BTC',
				market: 'BTC-PERP-10',
				marketplace: 'Exchange A',
				fundingRate: 0.1,
				fundingRatePrevious: 0.001,
				fundingRate7dAverage: 0.1,
				fundingRate7dSum: 0.7,
				fundingRate30dAverage: 0.1,
				fundingRate30dSum: 3,
				openInterest: 100,
				indexPrice: 20_000
			},
			{
				symbol: 'BTC',
				baseAsset: 'BTC',
				market: 'BTC-PERP-0.5',
				marketplace: 'Exchange C',
				fundingRate: 0.005,
				fundingRatePrevious: 0.001,
				fundingRate7dAverage: 0.005,
				fundingRate7dSum: 0.035,
				fundingRate30dAverage: 0.005,
				fundingRate30dSum: 0.15,
				openInterest: 300,
				indexPrice: 20_000
			}
		]

		const result = buildYieldLongShortPageResponse({
			data,
			perps,
			query: { token: 'BTC', sortBy: 'fr8hCurrent', sortDesc: 'true', pageSize: 'all' }
		})

		expect(result.rows.map((row) => row.symbolPerp)).toEqual(['BTC-PERP-10', 'BTC-PERP-2', 'BTC-PERP-0.5'])
		expect(result.rows.map((row) => row.fr8hCurrent)).toEqual(['10.000', '2.000', '0.500'])
	})

	it('keeps halal route filtering scoped while preserving pool token and zero-APY semantics', () => {
		const data = pageData([
			pool('curve-zero', { symbol: 'USDC', projectName: 'Curve', apy: 0, stablecoin: true }),
			pool('curve-ausdc', { symbol: 'AUSDC', projectName: 'Curve', apy: 5 }),
			pool('aave', { symbol: 'USDC', project: 'aave-v3', projectName: 'Aave V3', category: 'Lending', apy: 5 }),
			pool('uni', { symbol: 'ETH-USDC', project: 'uniswap-v3', projectName: 'Uniswap V3', apy: 5 })
		])

		const metadata = buildYieldHalalPageMetadata(data)
		expect(metadata).not.toHaveProperty('pools')
		expect(metadata.projectList).toEqual(['Curve', 'Uniswap V3'])
		expect(metadata.categoryList).toEqual(['Dexes'])

		const result = buildYieldHalalPageResponse(data, {
			token: 'USDC',
			sortBy: 'apy',
			sortDesc: 'true'
		})

		expect(result.rows.map((row) => row.configID)).toEqual(['uni', 'curve-zero'])
		expect(result.rows[1]).toMatchObject({
			apy: 0,
			pegDeviation: 0.1,
			pegPrice: 1.001
		})
	})

	it('returns all rows for pageSize=all and keeps stable sort ties in original order', () => {
		const data = pageData([
			pool('first', { apy: 5 }),
			pool('tie-a', { apy: 10 }),
			pool('tie-b', { apy: 10 }),
			pool('last', { apy: 1 })
		])

		const result = buildYieldHalalPageResponse(data, {
			page: '2',
			pageSize: 'all',
			sortBy: 'apy',
			sortDesc: 'true'
		})

		expect(result).toMatchObject({ total: 4, page: 1, pageSize: 4, hasMore: false })
		expect(result.rows.map((row) => row.configID)).toEqual(['tie-a', 'tie-b', 'first', 'last'])

		const firstPage = buildYieldHalalPageResponse(data, {
			pageSize: 'all',
			sortBy: 'apy',
			sortDesc: 'true'
		})
		expect(firstPage.rows.map((row) => row.configID)).toEqual(['tie-a', 'tie-b', 'first', 'last'])
	})
})
