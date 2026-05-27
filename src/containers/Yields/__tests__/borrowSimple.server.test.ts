import { describe, expect, it } from 'vitest'
import { buildBorrowRowsQueryString } from '../borrowSimple'
import { buildBorrowPageMetadata, buildBorrowPageRows } from '../borrowSimple.server'

const lendBorrowData = {
	props: {
		symbols: ['ETH (Wrapped)', 'USDC', 'ETH'],
		pools: [
			{
				pool: 'eth-collateral',
				chain: 'Ethereum',
				project: 'aave-v3',
				projectName: 'Aave V3',
				category: 'Lending',
				symbol: 'eth',
				apyBase: 1,
				apyReward: 0,
				apy: 1,
				ltv: 0.8,
				tvlUsd: 1_000_000,
				totalAvailableUsd: 1_000_000,
				borrowable: true,
				stablecoin: false
			},
			{
				pool: 'usdc-borrow',
				chain: 'Ethereum',
				project: 'aave-v3',
				projectName: 'Aave V3',
				category: 'Lending',
				symbol: 'USDC',
				apyBase: 0,
				apyReward: 0,
				apy: 0,
				apyBaseBorrow: -3,
				apyRewardBorrow: 1,
				apyBorrow: -2,
				ltv: 0.8,
				tvlUsd: 2_000_000,
				totalAvailableUsd: 500_000,
				borrowable: true,
				stablecoin: true
			},
			{
				pool: 'liquity-eth-cdp',
				chain: 'Ethereum',
				project: 'liquity-v1',
				projectName: 'Liquity',
				category: 'CDP',
				symbol: 'ETH',
				mintedCoin: 'LUSD',
				apyBase: 0,
				apyReward: 0,
				apy: 0,
				apyBaseBorrow: -0.5,
				apyRewardBorrow: 0,
				apyBorrow: -0.5,
				ltv: 0.9,
				tvlUsd: 10_000_000,
				totalAvailableUsd: null,
				borrowable: true,
				stablecoin: false
			}
		]
	}
} as any

describe('borrow simple data shaping', () => {
	it('keeps static page metadata small and ordered for search', () => {
		const metadata = buildBorrowPageMetadata(lendBorrowData, [
			{ symbol: 'USDC', id: 'usd-coin', name: 'USD Coin' },
			{ symbol: 'ETH', id: 'ethereum', name: 'Ethereum' }
		] as any)

		expect(metadata).toEqual({
			searchData: {
				USD_STABLES: { name: 'All USD Stablecoins', symbol: 'USD_STABLES' },
				USDC: { name: 'USDC', symbol: 'USDC' },
				ETH: { name: 'ETH', symbol: 'ETH' }
			}
		})
		expect('pools' in metadata).toBe(false)
	})

	it('returns compact optimizer rows for selected borrow and collateral tokens', () => {
		const response = buildBorrowPageRows(lendBorrowData, {
			collateral: 'ETH',
			borrow: 'USDC'
		})

		expect(response.total).toBe(1)
		expect(response.rows[0]).toMatchObject({
			pool: 'eth-collateral',
			projectName: 'Aave V3',
			borrow: {
				totalAvailableUsd: 500_000,
				apyBorrow: -2,
				apyBaseBorrow: -3
			}
		})
		expect(response.rows[0]).not.toHaveProperty('symbol')
		expect(response.rows[0]).not.toHaveProperty('category')
	})

	it('preserves CDP route support for simple borrow queries', () => {
		const response = buildBorrowPageRows(lendBorrowData, {
			collateral: 'ETH',
			borrow: 'LUSD'
		})

		expect(response.rows).toHaveLength(1)
		expect(response.rows[0]).toMatchObject({
			pool: 'liquity-eth-cdp',
			projectName: 'Liquity',
			borrow: {
				apyBorrow: -0.5
			}
		})
	})

	it('builds row query strings only from row selectors', () => {
		expect(
			buildBorrowRowsQueryString({
				borrow: 'USDC',
				collateral: 'ETH',
				incentives: 'true'
			})
		).toBe('?borrow=USDC&collateral=ETH')
		expect(buildBorrowRowsQueryString({ incentives: 'true' })).toBeNull()
	})
})
