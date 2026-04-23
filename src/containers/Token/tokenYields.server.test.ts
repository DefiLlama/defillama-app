import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/containers/Yields/queries/index', () => ({
	getYieldPageDataFromNetwork: vi.fn(),
	getLendBorrowDataFromYieldPageData: vi.fn()
}))

import { getLendBorrowDataFromYieldPageData, getYieldPageDataFromNetwork } from '~/containers/Yields/queries/index'
import { getTokenYieldsRows } from './tokenYields.server'

const mockedGetYieldPageDataFromNetwork = getYieldPageDataFromNetwork as unknown as ReturnType<typeof vi.fn>
const mockedGetLendBorrowDataFromYieldPageData = getLendBorrowDataFromYieldPageData as unknown as ReturnType<
	typeof vi.fn
>

beforeEach(() => {
	vi.clearAllMocks()
	mockedGetYieldPageDataFromNetwork.mockResolvedValue({
		props: {
			pools: [
				{
					pool: 'pool-1',
					project: 'aave-v3',
					projectName: 'Aave',
					chain: 'Ethereum',
					chains: ['Ethereum'],
					symbol: 'ETH-USDC',
					apy: 7,
					apyBase: 5,
					apyReward: 2,
					tvlUsd: 1_000_000,
					rewardTokensSymbols: ['AAVE'],
					rewardTokens: ['aave'],
					airdrop: false,
					url: 'https://example.com/pool-1'
				},
				{
					pool: 'pool-2',
					project: 'aave-v3',
					projectName: 'Aave',
					chain: 'Ethereum',
					chains: ['Ethereum'],
					symbol: 'LINK-USDC',
					apy: 5,
					apyBase: 4,
					apyReward: 1,
					tvlUsd: 500_000,
					rewardTokensSymbols: [],
					rewardTokens: [],
					airdrop: false,
					url: 'https://example.com/pool-2'
				}
			]
		}
	})
	mockedGetLendBorrowDataFromYieldPageData.mockResolvedValue({
		props: {
			pools: [
				{
					pool: 'pool-1',
					apyBaseBorrow: 3,
					apyRewardBorrow: 1,
					apyBorrow: -2,
					totalSupplyUsd: 800_000,
					totalBorrowUsd: 300_000,
					totalAvailableUsd: 500_000,
					ltv: 0.75
				}
			]
		}
	})
})

describe('getTokenYieldsRows', () => {
	it('returns token-filtered rows with lend/borrow augmentation', async () => {
		const rows = await getTokenYieldsRows('ETH')

		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			pool: 'ETH-USDC',
			configID: 'pool-1',
			project: 'Aave',
			projectslug: 'aave-v3',
			apyBorrow: -2,
			apyBaseBorrow: 3,
			apyRewardBorrow: 1,
			totalAvailableUsd: 500_000,
			ltv: 0.75
		})
	})
})
