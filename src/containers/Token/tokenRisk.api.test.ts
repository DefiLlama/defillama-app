import type { NextApiRequest, NextApiResponse } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/containers/Token/api', () => ({
	getTokenRiskBorrowRoutes: vi.fn(),
	getTokenRiskLendingRisks: vi.fn()
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		protocolLlamaswapDataset: {},
		protocolMetadata: {},
		chainMetadata: {}
	},
	refreshMetadataIfStale: vi.fn()
}))

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
					symbol: 'wstETH',
					address: '0xCollateral2',
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

async function loadModules() {
	const api = await import('~/containers/Token/api')
	const metadata = await import('~/utils/metadata')
	const handler = (await import('~/pages/api/datasets/token-risk')).default

	return {
		handler,
		mockedGetTokenRiskBorrowRoutes: vi.mocked(api.getTokenRiskBorrowRoutes),
		mockedGetTokenRiskLendingRisks: vi.mocked(api.getTokenRiskLendingRisks),
		metadataCache: metadata.default as {
			protocolLlamaswapDataset: Record<string, unknown>
			protocolMetadata: Record<string, unknown>
			chainMetadata: Record<string, unknown>
		},
		mockedRefreshMetadataIfStale: vi.mocked(metadata.refreshMetadataIfStale)
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

describe('token-risk api route', () => {
	it('returns aggregate token risk data and cache headers', async () => {
		const {
			handler,
			mockedGetTokenRiskBorrowRoutes,
			mockedGetTokenRiskLendingRisks,
			metadataCache,
			mockedRefreshMetadataIfStale
		} = await loadModules()
		mockedGetTokenRiskBorrowRoutes.mockResolvedValue(createBorrowRoutesResponse() as never)
		metadataCache.protocolLlamaswapDataset = {
			usdc: [{ chain: 'ethereum', address: '0xA0b8', displayName: 'Ethereum' }]
		}
		metadataCache.protocolMetadata = {
			aave: { name: 'aave-v3', displayName: 'Aave V3' }
		}
		metadataCache.chainMetadata = {
			ethereum: { id: '1', name: 'Ethereum' }
		}

		const req = {
			method: 'GET',
			query: { geckoId: 'usdc' }
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(mockedRefreshMetadataIfStale).toHaveBeenCalledTimes(1)
		expect(mockedGetTokenRiskBorrowRoutes).toHaveBeenCalledTimes(1)
		expect(mockedGetTokenRiskLendingRisks).not.toHaveBeenCalled()
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
		expect(res.status).toHaveBeenCalledWith(200)

		const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(payload.candidates).toEqual([
			{
				key: 'ethereum:0xa0b8',
				chain: 'ethereum',
				address: '0xa0b8',
				displayName: 'Ethereum'
			}
		])
		expect(payload.scopeCandidates).toEqual(payload.candidates)
		expect(payload.borrowCaps.rows[0].protocolDisplayName).toBe('Aave V3')
		expect(payload.borrowCaps.rows[0].chainDisplayName).toBe('Ethereum')
		expect(payload.collateralRisk.rows[0].protocolDisplayName).toBe('Aave V3')
		expect(payload.collateralRisk.rows[0].chainDisplayName).toBe('Ethereum')
		expect(payload.borrowCaps.rows).toHaveLength(1)
		expect(payload.collateralRisk.rows).toHaveLength(1)
	})

	it('uses exact lending-risks drilldown when a candidate is selected', async () => {
		const { handler, mockedGetTokenRiskBorrowRoutes, mockedGetTokenRiskLendingRisks, metadataCache } =
			await loadModules()
		mockedGetTokenRiskBorrowRoutes.mockResolvedValue(createBorrowRoutesResponse() as never)
		mockedGetTokenRiskLendingRisks.mockResolvedValue({
			methodologies: {
				...createBorrowRoutesResponse().methodologies,
				asDebt: 'Debt routes',
				asCollateral: 'Collateral routes'
			},
			timestamp: 10,
			hourlyTimestamp: 9,
			results: {
				'ethereum:0xa0b8': {
					asDebt: createBorrowRoutesResponse().routes.slice(0, 1),
					asCollateral: createBorrowRoutesResponse().routes.slice(2)
				}
			}
		} as never)
		metadataCache.protocolLlamaswapDataset = {
			usdc: [{ chain: 'ethereum', address: '0xA0b8', displayName: 'Ethereum' }]
		}
		metadataCache.protocolMetadata = {
			aave: { name: 'aave-v3', displayName: 'Aave V3' }
		}
		metadataCache.chainMetadata = {
			ethereum: { id: '1', name: 'Ethereum' }
		}

		const req = {
			method: 'GET',
			query: { geckoId: 'usdc', candidate: 'ethereum:0xa0b8' }
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(mockedGetTokenRiskLendingRisks).toHaveBeenCalledWith('ethereum:0xa0b8')

		const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(payload.selectedCandidateKey).toBe('ethereum:0xa0b8')
		expect(payload.selectedChainRisk.candidateKey).toBe('ethereum:0xa0b8')
		expect(payload.borrowCaps.rows).toHaveLength(1)
		expect(payload.collateralRisk.rows).toHaveLength(1)
	})

	it('keeps resolved candidates but only exposes chains with data in the scope list', async () => {
		const { handler, mockedGetTokenRiskBorrowRoutes, metadataCache } = await loadModules()
		mockedGetTokenRiskBorrowRoutes.mockResolvedValue(createBorrowRoutesResponse() as never)
		metadataCache.protocolLlamaswapDataset = {
			usdc: [
				{ chain: 'ethereum', address: '0xA0b8', displayName: 'Ethereum' },
				{ chain: 'base', address: '0x8335', displayName: 'Base' }
			]
		}
		metadataCache.protocolMetadata = {
			aave: { name: 'aave-v3', displayName: 'Aave V3' }
		}
		metadataCache.chainMetadata = {
			ethereum: { id: '1', name: 'Ethereum' },
			base: { id: '8453', name: 'Base' }
		}

		const req = {
			method: 'GET',
			query: { geckoId: 'usdc' }
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(payload.candidates).toHaveLength(2)
		expect(payload.scopeCandidates).toEqual([
			{
				key: 'ethereum:0xa0b8',
				chain: 'ethereum',
				address: '0xa0b8',
				displayName: 'Ethereum'
			}
		])
	})

	it('reuses the cached borrow-routes payload across requests in the same module instance', async () => {
		const { handler, mockedGetTokenRiskBorrowRoutes, metadataCache } = await loadModules()
		mockedGetTokenRiskBorrowRoutes.mockResolvedValue(createBorrowRoutesResponse() as never)
		metadataCache.protocolLlamaswapDataset = {
			usdc: [{ chain: 'ethereum', address: '0xA0b8', displayName: 'Ethereum' }]
		}
		metadataCache.protocolMetadata = {
			aave: { name: 'aave-v3', displayName: 'Aave V3' }
		}
		metadataCache.chainMetadata = {
			ethereum: { id: '1', name: 'Ethereum' }
		}

		const firstReq = {
			method: 'GET',
			query: { geckoId: 'usdc' }
		} as unknown as NextApiRequest
		const secondReq = {
			method: 'GET',
			query: { geckoId: 'usdc' }
		} as unknown as NextApiRequest

		await handler(firstReq, createRes())
		await handler(secondReq, createRes())

		expect(mockedGetTokenRiskBorrowRoutes).toHaveBeenCalledTimes(1)
	})

	it('returns 400 when geckoId is missing', async () => {
		const { handler } = await loadModules()
		const req = {
			method: 'GET',
			query: {}
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(res.status).toHaveBeenCalledWith(400)
		expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
			error: 'Missing geckoId query param'
		})
	})
})
