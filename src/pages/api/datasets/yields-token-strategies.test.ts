import type { NextApiRequest, NextApiResponse } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/containers/Yields/queries/index', () => ({
	getLendBorrowData: vi.fn(),
	getPerpData: vi.fn()
}))

import { getLendBorrowData, getPerpData } from '~/containers/Yields/queries/index'
import handler from './yields-token-strategies'

const mockedGetLendBorrowData = getLendBorrowData as unknown as ReturnType<typeof vi.fn>
const mockedGetPerpData = getPerpData as unknown as ReturnType<typeof vi.fn>

function createRes() {
	const res: Partial<NextApiResponse> = {
		setHeader: vi.fn(),
		status: vi.fn(),
		json: vi.fn()
	}

	;(res.status as ReturnType<typeof vi.fn>).mockImplementation(() => res as NextApiResponse)
	;(res.json as ReturnType<typeof vi.fn>).mockImplementation(() => res as NextApiResponse)

	return res as NextApiResponse
}

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
					pool: 'in-pool',
					project: 'aave-v3',
					projectName: 'Aave',
					chain: 'Ethereum',
					symbol: 'IN-USDC',
					apy: 6,
					tvlUsd: 200_000,
					ilRisk: 'no',
					exposure: 'single',
					airdrop: false,
					raiseValuation: null,
					url: 'https://example.com/in-pool'
				},
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

	mockedGetPerpData.mockResolvedValue([
		{
			symbol: 'IN',
			baseAsset: 'IN',
			market: 'IN-PERP',
			marketplace: 'Hyperliquid',
			fundingRatePrevious: 0.001,
			fundingRate: 0.0015,
			fundingRate7dSum: 0.01,
			fundingRate30dSum: 0.03,
			fundingRate7dAverage: 0.001,
			fundingRate30dAverage: 0.001,
			openInterest: 1000,
			indexPrice: 10
		},
		{
			symbol: 'LINK',
			baseAsset: 'LINK',
			market: 'LINK-PERP',
			marketplace: 'Hyperliquid',
			fundingRatePrevious: 0.002,
			fundingRate: 0.0025,
			fundingRate7dSum: 0.02,
			fundingRate30dSum: 0.04,
			fundingRate7dAverage: 0.002,
			fundingRate30dAverage: 0.002,
			openInterest: 2000,
			indexPrice: 15
		}
	])
})

describe('yields-token-strategies api route', () => {
	it('returns combined borrow and long/short data for a token and sets cache headers', async () => {
		const req = {
			method: 'GET',
			query: { token: 'ETH' }
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(mockedGetLendBorrowData).toHaveBeenCalledTimes(1)
		expect(mockedGetPerpData).toHaveBeenCalledTimes(1)
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
		expect(res.status).toHaveBeenCalledWith(200)

		const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(payload.borrowAsCollateral).toHaveLength(2)
		expect(payload.borrowAsCollateral[0].symbol).toBe('ETH')
		expect(payload.borrowAsDebt).toHaveLength(2)
		expect(payload.borrowAsDebt[0].borrow.symbol).toBe('ETH')
	})

	it('uses exact token matching for long/short pool selection', async () => {
		const req = {
			method: 'GET',
			query: { token: 'IN' }
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(payload.longShort).toHaveLength(1)
		expect(payload.longShort[0].symbol).toBe('IN-USDC')
	})

	it('returns 400 when token is missing', async () => {
		const req = {
			method: 'GET',
			query: {}
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Missing token query param' })
	})
})
