import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTokenRiskBorrowRoutes } from './api'
import { getTokenRiskData } from './queries'

vi.mock('./api', () => ({
	getTokenRiskBorrowRoutes: vi.fn()
}))

function createBorrowRoutesResponse() {
	return {
		methodologies: {
			protocol: 'Protocol',
			chain: 'Chain',
			market: 'Market',
			collateral: 'Collateral',
			debt: 'Debt',
			collateralTotalSupplyUsd: 'Collateral supply',
			debtTotalSupplyUsd: 'Debt supply',
			debtTotalBorrowedUsd: 'Debt borrowed',
			debtUtilization: 'Debt utilization',
			maxLtv: 'Max LTV',
			liquidationThreshold: 'Liquidation threshold',
			liquidationPenalty: 'Liquidation penalty',
			availableToBorrowUsd: 'Available to borrow',
			borrowCapUsd: 'Borrow cap',
			isolationMode: 'Isolation mode',
			debtCeilingUsd: 'Debt ceiling',
			borrowApy: 'Borrow APY',
			collateralSupplyApy: 'Collateral APY'
		},
		timestamp: 1,
		hourlyTimestamp: 1,
		routes: [
			{
				protocol: 'aave-v3',
				chain: 'ethereum',
				market: 'core-market',
				collateral: {
					symbol: 'WBTC',
					address: '0xCollateral1',
					priceUsd: 100
				},
				debt: {
					symbol: 'USDC',
					address: '0xA0b8',
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
				collateralSupplyApy: 0
			},
			{
				protocol: 'aave-v3',
				chain: 'ethereum',
				market: 'core-market',
				collateral: {
					symbol: 'USDC',
					address: '0xA0b8',
					priceUsd: 1
				},
				debt: {
					symbol: 'WBTC',
					address: '0xDebtBtc',
					priceUsd: 100
				},
				collateralTotalSupplyUsd: 1000,
				debtTotalSupplyUsd: 900,
				debtTotalBorrowedUsd: 300,
				debtUtilization: 0.33,
				maxLtv: 0.7,
				liquidationThreshold: 0.78,
				liquidationPenalty: 0.04,
				availableToBorrowUsd: 500,
				borrowCapUsd: 900,
				isolationMode: true,
				debtCeilingUsd: 1000,
				borrowApy: 0.02,
				collateralSupplyApy: 0.01
			}
		]
	}
}

const displayLookups = {
	protocolDisplayNames: new Map([
		['aave-v3', 'Aave V3'],
		['morpho-blue', 'Morpho Blue']
	]),
	chainDisplayNames: new Map([
		['ethereum', 'Ethereum'],
		['base', 'Base']
	])
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('getTokenRiskData', () => {
	it('builds aggregate token risk data from the live borrow-routes payload', async () => {
		const mockedGetTokenRiskBorrowRoutes = vi.mocked(getTokenRiskBorrowRoutes)
		mockedGetTokenRiskBorrowRoutes.mockResolvedValue(createBorrowRoutesResponse() as never)

		const payload = await getTokenRiskData({
			geckoId: 'usdc',
			protocolLlamaswapDataset: {
				usdc: [{ chain: 'ethereum', address: '0xA0b8', displayName: 'Ethereum' }]
			},
			displayLookups
		})

		expect(payload).not.toBeNull()
		expect(payload?.candidates).toEqual([
			{
				key: 'ethereum:0xa0b8',
				chain: 'ethereum',
				address: '0xa0b8',
				displayName: 'Ethereum'
			}
		])
		expect(payload?.scopeCandidates).toEqual(payload?.candidates)
		expect(payload?.selectedCandidateKey).toBeNull()
		expect(payload?.selectedChainRisk).toBeNull()
		expect(payload?.borrowCaps.rows[0].protocolDisplayName).toBe('Aave V3')
		expect(payload?.borrowCaps.rows[0].chainDisplayName).toBe('Ethereum')
		expect(payload?.collateralRisk.rows[0].protocolDisplayName).toBe('Aave V3')
		expect(payload?.collateralRisk.rows[0].chainDisplayName).toBe('Ethereum')
		expect(payload?.limitations.length).toBeGreaterThan(0)
	})

	it('returns collateral-side risk data when the token has no debt-side borrowing rows', async () => {
		const mockedGetTokenRiskBorrowRoutes = vi.mocked(getTokenRiskBorrowRoutes)
		mockedGetTokenRiskBorrowRoutes.mockResolvedValue(createBorrowRoutesResponse() as never)

		const payload = await getTokenRiskData({
			geckoId: 'collateral-only',
			protocolLlamaswapDataset: {
				'collateral-only': [{ chain: 'ethereum', address: '0xCollateral1', displayName: 'Ethereum' }]
			},
			displayLookups
		})

		expect(payload).not.toBeNull()
		expect(payload?.borrowCaps.rows).toEqual([])
		expect(payload?.collateralRisk.rows).toHaveLength(1)
		expect(payload?.limitations.length).toBeGreaterThan(0)
		expect(payload?.limitations.every((l) => !l.includes('Debt-side totals'))).toBe(true)
	})

	it('returns null when the token cannot be resolved from protocol llamaswap metadata', async () => {
		const mockedGetTokenRiskBorrowRoutes = vi.mocked(getTokenRiskBorrowRoutes)
		mockedGetTokenRiskBorrowRoutes.mockResolvedValue(createBorrowRoutesResponse() as never)

		const payload = await getTokenRiskData({
			geckoId: 'missing',
			protocolLlamaswapDataset: {},
			displayLookups
		})

		expect(payload).toBeNull()
		expect(mockedGetTokenRiskBorrowRoutes.mock.calls).toHaveLength(0)
	})
})
