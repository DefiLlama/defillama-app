import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/containers/Yields/queries/index', () => ({
	getLendBorrowData: vi.fn()
}))

import { getLendBorrowData } from '~/containers/Yields/queries/index'
import { getTokenBorrowRoutesData } from './tokenBorrowRoutes.server'

const mockedGetLendBorrowData = getLendBorrowData as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.clearAllMocks()

	mockedGetLendBorrowData.mockResolvedValue({
		props: {
			pools: [
				{
					pool: 'eth-aave',
					configID: 'eth-aave',
					project: 'aave-v3',
					projectName: 'Aave',
					chain: 'Ethereum',
					category: 'Lending',
					symbol: 'ETH',
					ltv: 0.75,
					apyBase: 1.5,
					apyReward: 0.25,
					apyBaseBorrow: -2,
					apyRewardBorrow: 0.1,
					apyBorrow: -1.9,
					totalSupplyUsd: 1_000_000,
					totalBorrowUsd: 500_000,
					totalAvailableUsd: 500_000,
					borrowable: true,
					mintedCoin: null,
					borrowFactor: 1,
					underlyingTokens: ['0xeth'],
					rewardTokensNames: [],
					rewardTokensSymbols: [],
					rewardTokens: [],
					chains: ['Ethereum'],
					airdrop: false,
					raiseValuation: null,
					url: 'https://example.com/eth-aave',
					stablecoin: false,
					exposure: 'single',
					ilRisk: 'no'
				},
				{
					pool: 'usdc-aave',
					configID: 'usdc-aave',
					project: 'aave-v3',
					projectName: 'Aave',
					chain: 'Ethereum',
					category: 'Lending',
					symbol: 'USDC',
					ltv: 0.85,
					apyBase: 2,
					apyReward: 0.1,
					apyBaseBorrow: -3,
					apyRewardBorrow: 0.2,
					apyBorrow: -2.8,
					totalSupplyUsd: 2_000_000,
					totalBorrowUsd: 1_200_000,
					totalAvailableUsd: 800_000,
					borrowable: true,
					mintedCoin: null,
					borrowFactor: 1,
					underlyingTokens: ['0xusdc'],
					rewardTokensNames: [],
					rewardTokensSymbols: [],
					rewardTokens: [],
					chains: ['Ethereum'],
					airdrop: false,
					raiseValuation: null,
					url: 'https://example.com/usdc-aave',
					stablecoin: true,
					exposure: 'single',
					ilRisk: 'no'
				},
				{
					pool: 'link-aave',
					configID: 'link-aave',
					project: 'aave-v3',
					projectName: 'Aave',
					chain: 'Ethereum',
					category: 'Lending',
					symbol: 'LINK',
					ltv: 0.6,
					apyBase: 1,
					apyReward: 0,
					apyBaseBorrow: -4,
					apyRewardBorrow: 0,
					apyBorrow: -4,
					totalSupplyUsd: 900_000,
					totalBorrowUsd: 600_000,
					totalAvailableUsd: 300_000,
					borrowable: true,
					mintedCoin: null,
					borrowFactor: 1,
					underlyingTokens: ['0xlink'],
					rewardTokensNames: [],
					rewardTokensSymbols: [],
					rewardTokens: [],
					chains: ['Ethereum'],
					airdrop: false,
					raiseValuation: null,
					url: 'https://example.com/link-aave',
					stablecoin: false,
					exposure: 'single',
					ilRisk: 'no'
				}
			],
			allPools: [
				{
					pool: 'link-pool',
					project: 'aave-v3',
					projectName: 'Aave',
					chain: 'Ethereum',
					symbol: 'LINK-USDC',
					apy: 7,
					tvlUsd: 250_000,
					ilRisk: 'no',
					exposure: 'single',
					airdrop: false,
					raiseValuation: null,
					url: 'https://example.com/link-pool'
				}
			]
		}
	})
})

describe('getTokenBorrowRoutesData', () => {
	it('returns borrow route data for a token', async () => {
		const payload = await getTokenBorrowRoutesData('LINK')

		expect(payload.borrowAsCollateral).toHaveLength(2)
		expect(payload.borrowAsCollateral[0].symbol).toBe('LINK')
		expect(payload.borrowAsDebt).toHaveLength(2)
		expect(payload.borrowAsDebt[0].borrow.symbol).toBe('LINK')
	})
})
