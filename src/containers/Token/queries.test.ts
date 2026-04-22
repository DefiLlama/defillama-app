import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTokenRiskBorrowCapacity } from './api'
import { getTokenRiskData, resetTokenRiskBorrowRoutesCache } from './queries'

vi.mock('./api', () => ({
	getTokenRiskBorrowCapacity: vi.fn()
}))

function createBorrowCapacityResponse() {
	return {
		methodologies: {
			asset: 'Collateral asset',
			chain: 'Chain',
			protocol: 'Protocol',
			collateralMaxBorrowUsdGovernance: 'Governance max borrow',
			collateralMaxBorrowUsdLiquidity: 'Liquidity max borrow',
			collateralBorrowedDebtUsd: 'Borrowed debt',
			minBadDebtAtPriceZeroUsd: 'Minimum bad debt at zero'
		},
		timestamp: 1,
		hourlyTimestamp: 1,
		tokens: [
			{
				asset: {
					symbol: 'USDC',
					address: '0xA0b8',
					priceUsd: 1
				},
				chain: 'ethereum',
				totals: {
					collateralMaxBorrowUsdGovernance: 1800,
					collateralMaxBorrowUsdLiquidity: 1500,
					collateralBorrowedDebtUsd: null,
					minBadDebtAtPriceZeroUsd: 400
				},
				byProtocol: [
					{
						protocol: 'aave-v3',
						collateralMaxBorrowUsdGovernance: 1200,
						collateralMaxBorrowUsdLiquidity: 1000,
						collateralBorrowedDebtUsd: 400,
						minBadDebtAtPriceZeroUsd: 400
					},
					{
						protocol: 'morpho-blue',
						collateralMaxBorrowUsdGovernance: null,
						collateralMaxBorrowUsdLiquidity: 500,
						collateralBorrowedDebtUsd: null,
						minBadDebtAtPriceZeroUsd: null
					}
				]
			},
			{
				asset: {
					symbol: 'WSTETH',
					address: '0xWstEth',
					priceUsd: 2000
				},
				chain: 'ethereum',
				totals: {
					collateralMaxBorrowUsdGovernance: null,
					collateralMaxBorrowUsdLiquidity: 750,
					collateralBorrowedDebtUsd: 250,
					minBadDebtAtPriceZeroUsd: 250
				},
				byProtocol: [
					{
						protocol: 'morpho-blue',
						collateralMaxBorrowUsdGovernance: null,
						collateralMaxBorrowUsdLiquidity: 750,
						collateralBorrowedDebtUsd: 250,
						minBadDebtAtPriceZeroUsd: 250
					}
				]
			},
			{
				asset: {
					symbol: 'USDC',
					address: '0x8335',
					priceUsd: 1
				},
				chain: 'base',
				totals: {
					collateralMaxBorrowUsdGovernance: 500,
					collateralMaxBorrowUsdLiquidity: 300,
					collateralBorrowedDebtUsd: 50,
					minBadDebtAtPriceZeroUsd: 25
				},
				byProtocol: [
					{
						protocol: 'aave-v3',
						collateralMaxBorrowUsdGovernance: 500,
						collateralMaxBorrowUsdLiquidity: 300,
						collateralBorrowedDebtUsd: 50,
						minBadDebtAtPriceZeroUsd: 25
					}
				]
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
	resetTokenRiskBorrowRoutesCache()
})

describe('getTokenRiskData', () => {
	it('builds token risk exposure data from the borrow capacity payload', async () => {
		const mockedGetTokenRiskBorrowCapacity = vi.mocked(getTokenRiskBorrowCapacity)
		mockedGetTokenRiskBorrowCapacity.mockResolvedValue(createBorrowCapacityResponse() as never)

		const payload = await getTokenRiskData({
			geckoId: 'usdc',
			tokenSymbol: 'USDC',
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
		expect(payload?.exposures.rows).toHaveLength(2)
		expect(payload?.exposures.rows[0].protocolDisplayName).toBe('Aave V3')
		expect(payload?.exposures.rows[0].chainDisplayName).toBe('Ethereum')
		expect(payload?.exposures.rows[0]).not.toHaveProperty('collateralBorrowedDebtUsd')
		expect(payload?.exposures.summary.totalCurrentMaxBorrowUsd).toBe(1500)
		expect(payload?.exposures.summary.totalMinBadDebtAtPriceZeroUsd).toBe(400)
		expect(payload?.exposures.summary.minBadDebtKnownCount).toBe(1)
		expect(payload?.exposures.summary.minBadDebtUnknownCount).toBe(1)
		expect(payload?.limitations).toContain(
			'Current exposure is a lower bound when some contributing markets return null for zero-price bad debt; null rows are excluded instead of being treated as zero.'
		)
	})

	it('aggregates multiple scoped candidates into one onchain view', async () => {
		const mockedGetTokenRiskBorrowCapacity = vi.mocked(getTokenRiskBorrowCapacity)
		mockedGetTokenRiskBorrowCapacity.mockResolvedValue(createBorrowCapacityResponse() as never)

		const payload = await getTokenRiskData({
			geckoId: 'usdc',
			tokenSymbol: 'USDC',
			protocolLlamaswapDataset: {
				usdc: [
					{ chain: 'ethereum', address: '0xA0b8', displayName: 'Ethereum' },
					{ chain: 'base', address: '0x8335', displayName: 'Base' }
				]
			},
			displayLookups
		})

		expect(payload?.scopeCandidates).toHaveLength(2)
		expect(payload?.exposures.summary.totalCurrentMaxBorrowUsd).toBe(1800)
		expect(payload?.exposures.summary.totalMinBadDebtAtPriceZeroUsd).toBe(425)
		expect(payload?.exposures.summary.protocolCount).toBe(2)
		expect(payload?.exposures.summary.chainCount).toBe(2)
	})

	it('falls back to borrow capacity symbols when protocol llamaswap metadata is missing', async () => {
		const mockedGetTokenRiskBorrowCapacity = vi.mocked(getTokenRiskBorrowCapacity)
		mockedGetTokenRiskBorrowCapacity.mockResolvedValue(createBorrowCapacityResponse() as never)

		const payload = await getTokenRiskData({
			geckoId: 'wrapped-steth',
			tokenSymbol: 'WSTETH',
			protocolLlamaswapDataset: {},
			displayLookups
		})

		expect(payload).not.toBeNull()
		expect(payload?.candidates).toContainEqual({
			key: 'ethereum:0xwsteth',
			chain: 'ethereum',
			address: '0xwsteth',
			displayName: 'Ethereum'
		})
		expect(payload?.exposures.summary.totalCurrentMaxBorrowUsd).toBe(750)
		expect(payload?.exposures.summary.totalMinBadDebtAtPriceZeroUsd).toBe(250)
		expect(payload?.limitations).not.toContain(
			'Current exposure is a lower bound when some contributing markets return null for zero-price bad debt; null rows are excluded instead of being treated as zero.'
		)
	})

	it('returns null when the token cannot be resolved from metadata or borrow capacity symbols', async () => {
		const mockedGetTokenRiskBorrowCapacity = vi.mocked(getTokenRiskBorrowCapacity)
		mockedGetTokenRiskBorrowCapacity.mockResolvedValue(createBorrowCapacityResponse() as never)

		const payload = await getTokenRiskData({
			geckoId: 'missing',
			tokenSymbol: 'MISSING',
			protocolLlamaswapDataset: {},
			displayLookups
		})

		expect(payload).toBeNull()
		expect(mockedGetTokenRiskBorrowCapacity.mock.calls).toHaveLength(1)
	})
})
