import { describe, expect, it } from 'vitest'
import { buildBorrowAdvancedRowsQueryString } from '../borrowAdvanced'
import { buildBorrowAdvancedPageMetadata, buildBorrowAdvancedPageRows } from '../borrowAdvanced.server'

const lendBorrowData = {
	props: {
		chainList: ['Ethereum', 'Arbitrum'],
		lendingProtocols: ['Aave V3', 'Liquity'],
		evmChains: ['Ethereum', 'Arbitrum'],
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
				ltv: 0.8,
				tvlUsd: 2_000_000,
				totalAvailableUsd: 500_000,
				borrowable: true,
				stablecoin: true,
				underlyingTokens: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48']
			},
			{
				pool: 'steth-collateral',
				chain: 'Ethereum',
				project: 'aave-v3',
				projectName: 'Aave V3',
				category: 'Lending',
				symbol: 'stETH',
				apyBase: 1,
				apyReward: 0,
				apy: 1,
				ltv: 0.75,
				tvlUsd: 1_000_000,
				totalAvailableUsd: 1_000_000,
				borrowable: true,
				stablecoin: false
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
				ltv: 0.9,
				tvlUsd: 10_000_000,
				totalAvailableUsd: null,
				totalSupplyUsd: null,
				totalBorrowUsd: 2_000_000,
				borrowable: true,
				stablecoin: false
			}
		]
	}
} as any

describe('borrow advanced data shaping', () => {
	it('keeps static page metadata small and ordered for search', () => {
		const metadata = buildBorrowAdvancedPageMetadata(lendBorrowData, [
			{ symbol: 'USDC', id: 'usd-coin', name: 'USD Coin' },
			{ symbol: 'ETH', id: 'ethereum', name: 'Ethereum' }
		] as any)

		expect(metadata).toEqual({
			chainList: ['Ethereum', 'Arbitrum'],
			lendingProtocols: ['Aave V3', 'Liquity'],
			evmChains: ['Ethereum', 'Arbitrum'],
			searchData: [
				{ name: 'USDC', symbol: 'USDC', image: '', image2: '' },
				{ name: 'ETH', symbol: 'ETH', image: '', image2: '' }
			]
		})
		expect('pools' in metadata).toBe(false)
	})

	it('returns only optimizer rows matching the selected route filters', () => {
		const rows = buildBorrowAdvancedPageRows(lendBorrowData, {
			lend: 'ETH',
			borrow: 'USDC',
			chain: 'Ethereum'
		})

		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			pool: 'eth-collateral',
			symbol: 'ETH',
			borrow: {
				pool: 'usdc-borrow',
				symbol: 'USDC'
			},
			borrowAvailableUsd: 500_000
		})
		expect(rows[0]).not.toHaveProperty('category')
		expect(rows[0].borrow).not.toHaveProperty('projectName')
	})

	it('applies chain filters before returning rows', () => {
		expect(
			buildBorrowAdvancedPageRows(lendBorrowData, {
				lend: 'ETH',
				borrow: 'USDC',
				chain: 'Arbitrum'
			})
		).toEqual([])
	})

	it('excludes stETH collateral matches when lending ETH', () => {
		const rows = buildBorrowAdvancedPageRows(lendBorrowData, {
			lend: 'ETH',
			borrow: 'USDC'
		})

		expect(rows.map((row) => row.pool)).toEqual(['eth-collateral'])
	})

	it('keeps unbounded debt ceiling projects when available filters are set', () => {
		const rows = buildBorrowAdvancedPageRows(lendBorrowData, {
			lend: 'ETH',
			borrow: 'LUSD',
			minAvailable: '100000000000'
		})

		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			pool: 'liquity-eth-cdp',
			project: 'liquity-v1',
			borrow: {
				symbol: 'LUSD',
				totalAvailableUsd: null
			}
		})
	})

	it('builds row query strings from the shared row query keys', () => {
		expect(
			buildBorrowAdvancedRowsQueryString({
				lend: 'ETH',
				borrow: 'USDC',
				chain: ['Ethereum', 'Arbitrum'],
				customLTV: '50',
				lendAmount: '10'
			})
		).toBe('?lend=ETH&borrow=USDC&chain=Ethereum&chain=Arbitrum&customLTV=50')
	})
})
