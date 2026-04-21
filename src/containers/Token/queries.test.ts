import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTokenRiskLendingExposures } from './api'
import { getTokenRiskData, resetTokenRiskBorrowRoutesCache } from './queries'

vi.mock('./api', () => ({
	getTokenRiskLendingExposures: vi.fn()
}))

function createLendingExposuresResponse() {
	return {
		methodologies: {
			asset: 'Collateral asset',
			chain: 'Chain',
			protocol: 'Protocol',
			collateralMaxBorrowUsd: 'Max borrow',
			collateralBorrowedDebtUsd: 'Borrowed debt',
			minBadDebtAtPriceZeroUsd: 'Minimum bad debt at zero'
		},
		timestamp: 1,
		hourlyTimestamp: 1,
		exposures: [
			{
				asset: {
					symbol: 'USDC',
					address: '0xA0b8',
					priceUsd: 1
				},
				chain: 'ethereum',
				protocol: 'aave-v3',
				collateralMaxBorrowUsd: 1000,
				collateralBorrowedDebtUsd: 400,
				minBadDebtAtPriceZeroUsd: 400
			},
			{
				asset: {
					symbol: 'USDC',
					address: '0xA0b8',
					priceUsd: 1
				},
				chain: 'ethereum',
				protocol: 'morpho-blue',
				collateralMaxBorrowUsd: 500,
				collateralBorrowedDebtUsd: null,
				minBadDebtAtPriceZeroUsd: null
			},
			{
				asset: {
					symbol: 'WSTETH',
					address: '0xWstEth',
					priceUsd: 2000
				},
				chain: 'ethereum',
				protocol: 'morpho-blue',
				collateralMaxBorrowUsd: 750,
				collateralBorrowedDebtUsd: 250,
				minBadDebtAtPriceZeroUsd: 250
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
	it('builds token risk exposure data from the lending exposures payload', async () => {
		const mockedGetTokenRiskLendingExposures = vi.mocked(getTokenRiskLendingExposures)
		mockedGetTokenRiskLendingExposures.mockResolvedValue(createLendingExposuresResponse() as never)

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
		expect(payload?.exposures.summary.totalCollateralMaxBorrowUsd).toBe(1500)
		expect(payload?.exposures.summary.totalCollateralBorrowedDebtUsd).toBeNull()
		expect(payload?.exposures.summary.totalMinBadDebtAtPriceZeroUsd).toBe(400)
		expect(payload?.exposures.summary.minBadDebtKnownCount).toBe(1)
		expect(payload?.exposures.summary.minBadDebtUnknownCount).toBe(1)
		expect(payload?.limitations).toContain(
			'When any contributing market cannot attribute borrowed debt to a specific collateral asset, borrowed-debt totals are returned as unavailable instead of being under-counted.'
		)
		expect(payload?.limitations).toContain(
			'Minimum bad-debt totals at a zero asset price are lower bounds when some contributing markets return null for this metric; null rows are excluded instead of being treated as zero.'
		)
	})

	it('falls back to exposure symbols when protocol llamaswap metadata is missing', async () => {
		const mockedGetTokenRiskLendingExposures = vi.mocked(getTokenRiskLendingExposures)
		mockedGetTokenRiskLendingExposures.mockResolvedValue(createLendingExposuresResponse() as never)

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
		expect(payload?.exposures.summary.totalCollateralBorrowedDebtUsd).toBe(250)
		expect(payload?.exposures.summary.totalMinBadDebtAtPriceZeroUsd).toBe(250)
		expect(payload?.limitations).not.toContain(
			'Minimum bad-debt totals at a zero asset price are lower bounds when some contributing markets return null for this metric; null rows are excluded instead of being treated as zero.'
		)
	})

	it('returns null when the token cannot be resolved from metadata or exposure symbols', async () => {
		const mockedGetTokenRiskLendingExposures = vi.mocked(getTokenRiskLendingExposures)
		mockedGetTokenRiskLendingExposures.mockResolvedValue(createLendingExposuresResponse() as never)

		const payload = await getTokenRiskData({
			geckoId: 'missing',
			tokenSymbol: 'MISSING',
			protocolLlamaswapDataset: {},
			displayLookups
		})

		expect(payload).toBeNull()
		expect(mockedGetTokenRiskLendingExposures.mock.calls).toHaveLength(1)
	})
})
