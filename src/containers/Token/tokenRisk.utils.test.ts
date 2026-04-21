import { describe, expect, it } from 'vitest'
import type { TokenRiskLendingRisksResponse, TokenRiskRoute } from './api.types'
import {
	buildBorrowCapsSection,
	buildCollateralRiskSection,
	filterTokenRiskCandidatesWithData,
	inferTokenRiskCandidatesFromRoutes,
	indexBorrowRoutesByAssetKey,
	mergeIndexedBuckets,
	resolveTokenRiskCandidates
} from './tokenRisk.utils'

const methodologies: TokenRiskLendingRisksResponse['methodologies'] = {
	asDebt: 'Debt routes',
	asCollateral: 'Collateral routes',
	protocol: 'Protocol',
	chain: 'Chain',
	market: 'Market',
	collateral: 'Collateral asset',
	debt: 'Debt asset',
	collateralTotalSupplyUsd: 'Collateral total supply',
	debtTotalSupplyUsd: 'Debt total supply',
	debtTotalBorrowedUsd: 'Debt total borrowed',
	debtUtilization: 'Debt utilization',
	maxLtv: 'Max LTV',
	liquidationThreshold: 'Liquidation threshold',
	liquidationPenalty: 'Liquidation penalty',
	availableToBorrowUsd: 'Available to borrow',
	borrowCapUsd: 'Borrow cap',
	isolationMode: 'Isolation mode',
	debtCeilingUsd: 'Debt ceiling',
	borrowApy: 'Borrow APY',
	collateralSupplyApy: 'Collateral supply APY'
}

function createRoute(overrides: Partial<TokenRiskRoute>): TokenRiskRoute {
	return {
		protocol: 'aave-v3',
		chain: 'ethereum',
		market: 'core-market',
		collateral: {
			symbol: 'WBTC',
			address: '0xCollateral',
			priceUsd: 100
		},
		debt: {
			symbol: 'USDC',
			address: '0xDebt',
			priceUsd: 1
		},
		collateralTotalSupplyUsd: 1000,
		debtTotalSupplyUsd: 800,
		debtTotalBorrowedUsd: 400,
		debtUtilization: 0.5,
		maxLtv: 0.75,
		liquidationThreshold: 0.8,
		liquidationPenalty: 0.05,
		availableToBorrowUsd: 200,
		borrowCapUsd: 1000,
		isolationMode: false,
		debtCeilingUsd: null,
		borrowApy: 0.04,
		collateralSupplyApy: 0,
		...overrides
	}
}

describe('tokenRisk utils', () => {
	it('resolves token risk candidates from llamaswap metadata and dedupes by chain/address', () => {
		const candidates = resolveTokenRiskCandidates('usdc', {
			usdc: [
				{ chain: 'Ethereum', address: '0xA0b8', displayName: 'Ethereum' },
				{ chain: 'ethereum', address: '0xa0b8', displayName: 'Ethereum duplicate' },
				{ chain: 'base', address: '0x8335', displayName: 'Base' }
			]
		})

		expect(candidates).toEqual([
			{
				key: 'ethereum:0xa0b8',
				chain: 'Ethereum',
				address: '0xa0b8',
				displayName: 'Ethereum'
			},
			{
				key: 'base:0x8335',
				chain: 'base',
				address: '0x8335',
				displayName: 'Base'
			}
		])
	})

	it('indexes borrow routes by chain-address key and merges buckets across candidates', () => {
		const routes = [
			createRoute({
				chain: 'Ethereum',
				collateral: { symbol: 'WBTC', address: '0xCollateral1', priceUsd: 100 }
			}),
			createRoute({
				chain: 'base',
				collateral: { symbol: 'cbBTC', address: '0xCollateral2', priceUsd: 100 },
				debt: { symbol: 'USDC', address: '0xDebt2', priceUsd: 1 }
			})
		]

		const indexedRoutes = indexBorrowRoutesByAssetKey(routes)
		const merged = mergeIndexedBuckets(indexedRoutes, ['ethereum:0xdebt', 'base:0xdebt2'])

		expect(merged.asDebt).toHaveLength(2)
		expect(merged.asCollateral).toHaveLength(0)
	})

	it('infers token risk candidates from route symbols', () => {
		const candidates = inferTokenRiskCandidatesFromRoutes({
			tokenSymbol: 'WSTETH',
			routes: [
				createRoute({
					chain: 'ethereum',
					collateral: { symbol: 'wstETH', address: '0xCollateral1', priceUsd: 100 }
				}),
				createRoute({
					chain: 'base',
					collateral: { symbol: 'WSTETH', address: '0xCollateral2', priceUsd: 100 }
				})
			],
			chainDisplayNames: new Map([
				['ethereum', 'Ethereum'],
				['base', 'Base']
			])
		})

		expect(candidates).toEqual([
			{
				key: 'ethereum:0xcollateral1',
				chain: 'ethereum',
				address: '0xcollateral1',
				displayName: 'Ethereum'
			},
			{
				key: 'base:0xcollateral2',
				chain: 'base',
				address: '0xcollateral2',
				displayName: 'Base'
			}
		])
	})

	it('returns a fresh empty bucket when there are no candidate keys', () => {
		const first = mergeIndexedBuckets(new Map(), [])
		const second = mergeIndexedBuckets(new Map(), [])

		first.asDebt.push(createRoute({}))

		expect(second).toEqual({
			asDebt: [],
			asCollateral: []
		})
	})

	it('filters scope candidates down to chains that have borrow or collateral routes', () => {
		const routes = [
			createRoute({
				chain: 'ethereum',
				debt: { symbol: 'USDC', address: '0xDebt', priceUsd: 1 }
			})
		]
		const indexedRoutes = indexBorrowRoutesByAssetKey(routes)
		const candidates = [
			{ key: 'ethereum:0xdebt', chain: 'ethereum', address: '0xdebt', displayName: 'Ethereum' },
			{ key: 'base:0x8335', chain: 'base', address: '0x8335', displayName: 'Base' }
		]

		expect(filterTokenRiskCandidatesWithData(candidates, indexedRoutes)).toEqual([candidates[0]])
	})

	it('dedupes borrow-cap rows by debt market and computes cap totals/headroom', () => {
		const bucket = {
			asDebt: [
				createRoute({
					collateral: { symbol: 'WBTC', address: '0xCollateral1', priceUsd: 100 }
				}),
				createRoute({
					collateral: { symbol: 'wstETH', address: '0xCollateral2', priceUsd: 100 }
				}),
				createRoute({
					protocol: 'spark',
					chain: 'ethereum',
					market: 'spark-market',
					borrowCapUsd: null,
					availableToBorrowUsd: 50
				})
			],
			asCollateral: []
		}

		const section = buildBorrowCapsSection(bucket, methodologies)

		expect(section.rows).toHaveLength(2)
		expect(section.rows[0].eligibleCollateralCount).toBe(2)
		expect(section.rows[0].protocolDisplayName).toBe('aave-v3')
		expect(section.rows[0].chainDisplayName).toBe('ethereum')
		expect(section.rows[0].displayBorrowCapUsd).toBe(1000)
		expect(section.rows[1].borrowCapUsd).toBeNull()
		expect(section.rows[1].displayBorrowCapUsd).toBeNull()
		expect(section.rows[1].remainingCapUsd).toBe(400)
		expect(section.summary.totalBorrowCapUsd).toBe(1000)
		expect(section.summary.totalBorrowedUsd).toBe(400)
		expect(section.summary.remainingCapUsd).toBe(600)
		expect(section.summary.capUtilization).toBe(0.4)
		expect(section.summary.marketCount).toBe(2)
	})

	it('falls back to debt ceiling for displayed borrow cap when governance borrow cap is missing', () => {
		const bucket = {
			asDebt: [
				createRoute({
					protocol: 'spark',
					chain: 'ethereum',
					market: 'spark-market',
					borrowCapUsd: null,
					debtCeilingUsd: 750,
					debtTotalBorrowedUsd: 250,
					debtTotalSupplyUsd: 600
				})
			],
			asCollateral: []
		}

		const section = buildBorrowCapsSection(bucket, methodologies)

		expect(section.rows[0].borrowCapUsd).toBeNull()
		expect(section.rows[0].debtCeilingUsd).toBe(750)
		expect(section.rows[0].displayBorrowCapUsd).toBe(750)
		expect(section.rows[0].remainingCapUsd).toBe(350)
		expect(section.summary.totalBorrowCapUsd).toBe(750)
		expect(section.summary.totalBorrowedUsd).toBe(250)
		expect(section.summary.remainingCapUsd).toBe(350)
	})

	it('computes collateral-risk totals, isolation counts, and liquidation buffers', () => {
		const bucket = {
			asDebt: [],
			asCollateral: [
				createRoute({
					debt: { symbol: 'USDT', address: '0xUsdt', priceUsd: 1 },
					availableToBorrowUsd: 300,
					borrowCapUsd: null,
					maxLtv: 0.7,
					liquidationThreshold: 0.78,
					isolationMode: true,
					debtCeilingUsd: 5000
				}),
				createRoute({
					debt: { symbol: 'DAI', address: '0xDai', priceUsd: 1 },
					availableToBorrowUsd: 150,
					maxLtv: 0.65,
					liquidationThreshold: 0.8,
					isolationMode: false,
					debtCeilingUsd: null
				})
			]
		}

		const section = buildCollateralRiskSection(bucket, methodologies)

		expect(section.summary.totalAvailableToBorrowUsd).toBe(450)
		expect(section.summary.routeCount).toBe(2)
		expect(section.summary.isolatedRouteCount).toBe(1)
		expect(section.summary.minLiquidationBuffer).toBeCloseTo(0.08)
		expect(section.summary.maxLiquidationBuffer).toBeCloseTo(0.15)
		expect(section.rows[0].debtSymbol).toBe('USDT')
		expect(section.rows[0].borrowCapUsd).toBeNull()
		expect(section.rows[0].displayBorrowCapUsd).toBe(5000)
		expect(section.rows[0].protocolDisplayName).toBe('aave-v3')
		expect(section.rows[0].chainDisplayName).toBe('ethereum')
	})

	it('sorts collateral-risk rows by available liquidity before implied cap', () => {
		const bucket = {
			asDebt: [],
			asCollateral: [
				createRoute({
					protocol: 'aave-v3',
					availableToBorrowUsd: 0,
					debtTotalBorrowedUsd: 1000,
					debtTotalSupplyUsd: 2000
				}),
				createRoute({
					protocol: 'morpho-v3',
					availableToBorrowUsd: 123,
					debtTotalBorrowedUsd: 0,
					debtTotalSupplyUsd: 123
				}),
				createRoute({
					protocol: 'compound-v3',
					availableToBorrowUsd: 900,
					debtTotalBorrowedUsd: 50,
					debtTotalSupplyUsd: 950
				})
			]
		}

		const section = buildCollateralRiskSection(bucket, methodologies)

		expect(section.rows.map((row) => row.protocol)).toEqual(['compound-v3', 'morpho-v3', 'aave-v3'])
	})
})
