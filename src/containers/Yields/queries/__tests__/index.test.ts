import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	YIELD_CHAIN_API,
	YIELD_CONFIG_API,
	YIELD_LEND_BORROW_API,
	YIELD_POOLS_API,
	YIELD_TOKEN_CATEGORIES_API,
	YIELD_URL_API
} from '~/containers/Yields/constants'

const {
	fetchJsonMock,
	fetchCoinPricesMock,
	fetchProtocolsMock,
	fetchRaisesFromNetworkMock,
	fetchStablecoinAssetsApiMock
} = vi.hoisted(() => ({
	fetchJsonMock: vi.fn(),
	fetchCoinPricesMock: vi.fn(),
	fetchProtocolsMock: vi.fn(),
	fetchRaisesFromNetworkMock: vi.fn(),
	fetchStablecoinAssetsApiMock: vi.fn()
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('~/api/pricing', () => ({
	fetchCoinPrices: fetchCoinPricesMock
}))

vi.mock('~/containers/ProtocolLists/api', () => ({
	fetchProtocols: fetchProtocolsMock
}))

vi.mock('~/containers/Raises/api', () => ({
	fetchRaisesFromNetwork: fetchRaisesFromNetworkMock
}))

vi.mock('~/containers/Stablecoins/api', () => ({
	fetchStablecoinAssetsApi: fetchStablecoinAssetsApiMock
}))

function mockYieldApiResponses() {
	fetchJsonMock.mockImplementation((url: string) => {
		if (url === YIELD_POOLS_API) return Promise.resolve({ data: [] })
		if (url === YIELD_CONFIG_API) return Promise.resolve({ protocols: {} })
		if (url === YIELD_URL_API) return Promise.resolve({})
		if (url === YIELD_CHAIN_API) return Promise.resolve([])
		if (url === YIELD_LEND_BORROW_API) return Promise.resolve([])
		if (url === YIELD_TOKEN_CATEGORIES_API) return Promise.resolve({})
		return Promise.resolve({})
	})
	fetchProtocolsMock.mockResolvedValue({ protocols: [], parentProtocols: [] })
	fetchRaisesFromNetworkMock.mockResolvedValue({ raises: [] })
	fetchCoinPricesMock.mockResolvedValue({})
	fetchStablecoinAssetsApiMock.mockResolvedValue({ peggedAssets: [] })
}

describe('yield network queries', () => {
	beforeEach(() => {
		fetchJsonMock.mockReset()
		fetchCoinPricesMock.mockReset()
		fetchProtocolsMock.mockReset()
		fetchRaisesFromNetworkMock.mockReset()
		fetchStablecoinAssetsApiMock.mockReset()
		mockYieldApiResponses()
	})

	it('passes explicit long timeouts to the yield page source APIs', async () => {
		const { getYieldPageDataFromNetwork } = await import('../../queries.server')

		await getYieldPageDataFromNetwork({ timeout: 180_000 })

		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_POOLS_API, { timeout: 180_000 })
		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_CONFIG_API, { timeout: 180_000 })
		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_URL_API, { timeout: 180_000 })
		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_CHAIN_API, { timeout: 180_000 })
		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_TOKEN_CATEGORIES_API, { timeout: 180_000 })
	})

	it('passes explicit long timeouts to the yield config API', async () => {
		const { fetchYieldConfigFromNetwork } = await import('../../queries.server')

		await fetchYieldConfigFromNetwork({ timeout: 180_000 })

		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_CONFIG_API, { timeout: 180_000 })
	})

	it('passes explicit long timeouts to the lend-borrow API', async () => {
		const { getLendBorrowDataFromYieldPageData, getYieldPageDataFromNetwork } = await import('../../queries.server')
		const yieldPageData = await getYieldPageDataFromNetwork({ timeout: 180_000 })
		fetchJsonMock.mockClear()
		mockYieldApiResponses()

		await getLendBorrowDataFromYieldPageData(yieldPageData, { timeout: 180_000 })

		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_LEND_BORROW_API, { timeout: 180_000 })
	})

	it('uses apyReward and borrow rewards when selecting lend-borrow reward tokens', async () => {
		const { getLendBorrowDataFromYieldPageData } = await import('../../queries.server')
		const yieldPageData = {
			props: {
				pools: [
					{
						pool: 'supply-only',
						symbol: 'ETH',
						project: 'aave-v3',
						projectName: 'Aave V3',
						chain: 'Ethereum',
						category: 'Lending',
						tvlUsd: 1_000,
						apy: 3,
						apyBase: 1,
						apyReward: 2,
						rewardTokens: ['yield-page-supply-token'],
						underlyingTokens: [],
						airdrop: false,
						raiseValuation: null,
						audits: null,
						url: ''
					},
					{
						pool: 'borrow-reward',
						symbol: 'USDC',
						project: 'aave-v3',
						projectName: 'Aave V3',
						chain: 'Ethereum',
						category: 'Lending',
						tvlUsd: 2_000,
						apy: 0,
						apyBase: 0,
						apyReward: null,
						rewardTokens: [],
						underlyingTokens: [],
						airdrop: false,
						raiseValuation: null,
						audits: null,
						url: ''
					},
					{
						pool: 'empty-lend-borrow-rewards',
						symbol: 'DAI',
						project: 'aave-v3',
						projectName: 'Aave V3',
						chain: 'Ethereum',
						category: 'Lending',
						tvlUsd: 3_000,
						apy: 2,
						apyBase: 1,
						apyReward: 1,
						rewardTokens: ['yield-page-fallback-token'],
						underlyingTokens: [],
						airdrop: false,
						raiseValuation: null,
						audits: null,
						url: ''
					}
				],
				tokenNameMapping: {},
				evmChains: []
			}
		} as any
		fetchJsonMock.mockImplementation((url: string) => {
			if (url === YIELD_LEND_BORROW_API) {
				return Promise.resolve([
					{
						pool: 'supply-only',
						apyBaseBorrow: null,
						apyRewardBorrow: null,
						totalSupplyUsd: 1_000,
						totalBorrowUsd: 0,
						ltv: 0.8,
						rewardTokens: ['lend-borrow-supply-token']
					},
					{
						pool: 'borrow-reward',
						apyBaseBorrow: 4,
						apyRewardBorrow: 1,
						totalSupplyUsd: 2_000,
						totalBorrowUsd: 500,
						ltv: 0.75,
						rewardTokens: ['lend-borrow-borrow-token']
					},
					{
						pool: 'empty-lend-borrow-rewards',
						apyBaseBorrow: null,
						apyRewardBorrow: null,
						totalSupplyUsd: 3_000,
						totalBorrowUsd: 0,
						ltv: 0.6,
						rewardTokens: []
					}
				])
			}
			return Promise.resolve({})
		})

		const result = await getLendBorrowDataFromYieldPageData(yieldPageData)
		const supplyOnly = result.props.pools.find((pool) => pool.pool === 'supply-only')
		const borrowReward = result.props.pools.find((pool) => pool.pool === 'borrow-reward')
		const emptyLendBorrowRewards = result.props.pools.find((pool) => pool.pool === 'empty-lend-borrow-rewards')

		expect(supplyOnly?.rewardTokens).toEqual(['lend-borrow-supply-token'])
		expect(supplyOnly?.apyBorrow).toBeNull()
		expect(borrowReward?.rewardTokens).toEqual(['lend-borrow-borrow-token'])
		expect(borrowReward?.apyBaseBorrow).toBe(-4)
		expect(borrowReward?.apyBorrow).toBe(-3)
		expect(emptyLendBorrowRewards?.rewardTokens).toEqual(['yield-page-fallback-token'])
	})

	it('looks up reward token prices with the same normalized key used for requests', async () => {
		const { enrichRewardTokenNames } = await import('../../normalizers/rewardTokens')
		fetchCoinPricesMock.mockResolvedValue({
			'ethereum:0xreward:token': { symbol: 'rwd' }
		})
		const data = {
			tokenNameMapping: {},
			pools: [
				{
					chain: 'Ethereum',
					project: 'test-project',
					rewardTokens: ['0xReward/Token'],
					rewardTokensSymbols: [],
					rewardTokensNames: []
				}
			]
		} as any

		const result = await enrichRewardTokenNames(data)

		expect(fetchCoinPricesMock).toHaveBeenCalledWith(['ethereum:0xreward:token'])
		expect(result.pools[0].rewardTokensSymbols).toEqual(['RWD'])
	})

	it('normalizes meme token category sets before matching pools', async () => {
		const { enrichYieldTokenCategories } = await import('../../normalizers/tokenCategories')
		fetchJsonMock.mockImplementation((url: string) => {
			if (url === YIELD_TOKEN_CATEGORIES_API) {
				return Promise.resolve({
					'meme-token': {
						addresses: [' Ethereum:0xABC/DEF '],
						symbols: [' PEPE ']
					}
				})
			}
			return Promise.resolve({})
		})
		const data = {
			tokenCategories: {},
			tokens: [],
			tokenSymbolsList: [],
			pools: [
				{ symbol: 'OTHER-USDC', chain: 'Ethereum', underlyingTokens: ['0xabc/def'] },
				{ symbol: 'PePe-USDC', chain: 'Ethereum', underlyingTokens: [] }
			]
		} as any

		const result = await enrichYieldTokenCategories(data)

		expect(result.pools.map((pool) => pool.hasMemeToken)).toEqual([true, true])
	})
})
