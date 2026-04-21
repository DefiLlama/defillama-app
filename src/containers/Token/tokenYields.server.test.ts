import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/constants', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/constants')>()
	return {
		...actual,
		YIELD_POOLS_API: 'pools-api',
		YIELD_CONFIG_API: 'config-api',
		YIELD_URL_API: 'url-api',
		YIELD_CHAIN_API: 'chain-api',
		YIELD_LEND_BORROW_API: 'lend-borrow-api'
	}
})

const { fetchJsonMock, fetchProtocolsMock, formatYieldsPageDataMock } = vi.hoisted(() => ({
	fetchJsonMock: vi.fn(),
	fetchProtocolsMock: vi.fn(),
	formatYieldsPageDataMock: vi.fn()
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('~/containers/Protocols/api', () => ({
	fetchProtocols: fetchProtocolsMock
}))

vi.mock('~/containers/Yields/queries/utils', () => ({
	formatYieldsPageData: formatYieldsPageDataMock
}))

import { getTokenYieldsRows } from './tokenYields.server'

beforeEach(() => {
	vi.clearAllMocks()
	fetchProtocolsMock.mockResolvedValue([])
	fetchJsonMock.mockResolvedValue([])
	formatYieldsPageDataMock.mockReturnValue({
		pools: [
			{
				pool: 'pool-1',
				project: 'aave-v3',
				projectName: 'Aave',
				chain: 'Ethereum',
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
	})
})

describe('getTokenYieldsRows', () => {
	it('returns token-filtered rows with lend/borrow augmentation', async () => {
		fetchJsonMock.mockImplementation(async (url: string) => {
			if (url === 'lend-borrow-api') {
				return [
					{
						pool: 'pool-1',
						apyBaseBorrow: 3,
						apyRewardBorrow: 1,
						totalSupplyUsd: 800_000,
						totalBorrowUsd: 300_000,
						ltv: 0.75
					}
				]
			}

			return []
		})

		const rows = await getTokenYieldsRows('ETH')

		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			pool: 'ETH-USDC',
			configID: 'pool-1',
			project: 'Aave',
			projectslug: 'aave-v3',
			apyBorrow: -2,
			apyBaseBorrow: -3,
			apyRewardBorrow: 1,
			totalAvailableUsd: 500_000,
			ltv: 0.75
		})
	})
})
