import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { getLiquidationsProtocolsResponseFromCacheMock, getLiquidationsProtocolChainIdsFromCacheMock } = vi.hoisted(
	() => ({
		getLiquidationsProtocolsResponseFromCacheMock: vi.fn(),
		getLiquidationsProtocolChainIdsFromCacheMock: vi.fn()
	})
)

const {
	getLiquidationsOverviewPageDataMock,
	getLiquidationsProtocolPageDataMock,
	getLiquidationsChainPageDataMock,
	getTokenLiquidationsSectionDataMock
} = vi.hoisted(() => ({
	getLiquidationsOverviewPageDataMock: vi.fn(),
	getLiquidationsProtocolPageDataMock: vi.fn(),
	getLiquidationsChainPageDataMock: vi.fn(),
	getTokenLiquidationsSectionDataMock: vi.fn()
}))

vi.mock('~/server/datasetCache/runtime/liquidations', () => ({
	getLiquidationsOverviewPageData: getLiquidationsOverviewPageDataMock,
	getLiquidationsProtocolPageData: getLiquidationsProtocolPageDataMock,
	getLiquidationsChainPageData: getLiquidationsChainPageDataMock,
	getTokenLiquidationsSectionData: getTokenLiquidationsSectionDataMock
}))

vi.mock('~/utils/apiAuth', () => ({
	validateSubscription: vi.fn()
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		chainMetadata: { arbitrum: { name: 'Arbitrum One', id: 'arbitrum' } },
		protocolMetadata: { sky: { displayName: 'Sky', name: 'sky' } },
		liquidationsTokenSymbolsSet: new Set(['WSTETH'])
	},
	refreshMetadataIfStale: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('~/server/datasetCache/liquidations', () => ({
	getLiquidationsProtocolsResponseFromCache: getLiquidationsProtocolsResponseFromCacheMock,
	getLiquidationsProtocolChainIdsFromCache: getLiquidationsProtocolChainIdsFromCacheMock
}))

import chainHandler from '~/pages/api/private/liquidations/[protocol]/[chain]'
import protocolHandler from '~/pages/api/private/liquidations/[protocol]/index'
import overviewHandler from '~/pages/api/private/liquidations/index'
import tokenHandler from '~/pages/api/private/token-liquidations/[symbol]'
import { validateSubscription } from '~/utils/apiAuth'

const mockedValidateSubscription = vi.mocked(validateSubscription)
const mockedGetLiquidationsOverviewPageData = vi.mocked(getLiquidationsOverviewPageDataMock)
const mockedGetLiquidationsProtocolPageData = vi.mocked(getLiquidationsProtocolPageDataMock)
const mockedGetLiquidationsChainPageData = vi.mocked(getLiquidationsChainPageDataMock)
const mockedGetTokenLiquidationsSectionData = vi.mocked(getTokenLiquidationsSectionDataMock)

beforeEach(() => {
	vi.clearAllMocks()
	mockedValidateSubscription.mockResolvedValue({ valid: true, isTrial: false })
	getLiquidationsProtocolsResponseFromCacheMock.mockResolvedValue({ protocols: ['sky'] })
	getLiquidationsProtocolChainIdsFromCacheMock.mockResolvedValue(['arbitrum'])
})

describe('liquidations api routes', () => {
	it('returns 405 for non-GET overview requests', async () => {
		const req = { method: 'POST', headers: {} } as NextApiRequest
		const res = createMockNextApiResponse()

		await overviewHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
	})

	it('returns 400 for missing protocol route params before auth', async () => {
		const req = { method: 'GET', headers: {}, query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await protocolHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Missing protocol parameter' })
		expect(mockedValidateSubscription).not.toHaveBeenCalled()
	})

	it('returns 400 for missing chain route params before auth', async () => {
		const req = {
			method: 'GET',
			headers: {},
			query: { protocol: 'sky' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await chainHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Missing protocol or chain parameter' })
		expect(mockedValidateSubscription).not.toHaveBeenCalled()
	})

	it('returns 400 for missing token route params before auth', async () => {
		const req = { method: 'GET', headers: {}, query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Missing symbol parameter' })
		expect(mockedValidateSubscription).not.toHaveBeenCalled()
	})

	it('returns 403 for unauthorized protocol requests', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { protocol: 'sky' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedValidateSubscription.mockResolvedValue({
			valid: false,
			status: 403,
			error: 'Active subscription required'
		})

		await protocolHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'Active subscription required' })
		expect(mockedGetLiquidationsProtocolPageData).not.toHaveBeenCalled()
	})

	it('returns 404 for unknown protocol requests after auth and before data fetch', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { protocol: 'unknown' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await protocolHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'Liquidations protocol not found' })
		expect(mockedValidateSubscription).toHaveBeenCalledWith('Bearer ok')
		expect(mockedGetLiquidationsProtocolPageData).not.toHaveBeenCalled()
	})

	it('returns overview data for authorized requests', async () => {
		const req = { method: 'GET', headers: { authorization: 'Bearer ok' }, query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedGetLiquidationsOverviewPageData.mockResolvedValue({
			protocolLinks: [{ label: 'Overview', to: '/liquidations' }],
			timestamp: 1,
			protocolCount: 1,
			chainCount: 1,
			positionCount: 1,
			totalCollateralUsd: 100,
			distributionChart: { tokens: [] },
			protocolRows: [],
			chainRows: []
		})

		await overviewHandler(req, res)

		expect(mockedValidateSubscription).toHaveBeenCalledWith('Bearer ok')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				protocolCount: 1,
				totalCollateralUsd: 100
			})
		)
	})

	it('returns chain data for authorized requests', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { protocol: 'sky', chain: 'arbitrum-one' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedGetLiquidationsChainPageData.mockResolvedValue({
			protocolLinks: [{ label: 'Overview', to: '/liquidations' }],
			chainLinks: [{ label: 'All Chains', to: '/liquidations/sky' }],
			protocolId: 'maker',
			protocolName: 'Sky',
			protocolSlug: 'sky',
			chainId: 'arbitrum',
			chainName: 'Arbitrum One',
			chainSlug: 'arbitrum-one',
			timestamp: 1,
			positionCount: 1,
			collateralCount: 1,
			totalCollateralUsd: 100,
			distributionChart: { tokens: [] },
			chainRows: [],
			ownerBlockExplorers: [],
			positions: []
		})

		await chainHandler(req, res)

		expect(mockedValidateSubscription).toHaveBeenCalledWith('Bearer ok')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				protocolName: 'Sky',
				chainName: 'Arbitrum One'
			})
		)
	})

	it('returns token liquidations for authorized requests', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { symbol: 'wsteth' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedGetTokenLiquidationsSectionData.mockResolvedValue({
			tokenSymbol: 'WSTETH',
			timestamp: 1,
			positionCount: 2,
			protocolCount: 2,
			chainCount: 1,
			totalCollateralUsd: 100,
			distributionChart: { tokens: [] },
			protocolRows: [],
			chainRows: []
		})

		await tokenHandler(req, res)

		expect(mockedValidateSubscription).toHaveBeenCalledWith('Bearer ok')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				tokenSymbol: 'WSTETH',
				totalCollateralUsd: 100
			})
		)
	})

	it('returns 404 when token liquidations are missing', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { symbol: 'missing' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedGetTokenLiquidationsSectionData.mockResolvedValue(null)

		await tokenHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'Token liquidations not found' })
	})

	it('returns a 500 json error when overview auth validation throws', async () => {
		const req = { method: 'GET', headers: { authorization: 'Bearer bad' }, query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedValidateSubscription.mockRejectedValue(new Error('Auth service unavailable'))

		await overviewHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch liquidations overview data' })
	})

	it('returns a 500 json error when protocol auth validation throws', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { protocol: 'sky' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedValidateSubscription.mockRejectedValue(new Error('Auth service unavailable'))

		await protocolHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch liquidations protocol data' })
	})

	it('returns a 500 json error when chain auth validation throws', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { protocol: 'sky', chain: 'arbitrum-one' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedValidateSubscription.mockRejectedValue(new Error('Auth service unavailable'))

		await chainHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch liquidations chain data' })
	})

	it('returns a 500 json error when token auth validation throws', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { symbol: 'wsteth' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()
		mockedValidateSubscription.mockRejectedValue(new Error('Auth service unavailable'))

		await tokenHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch token liquidations data' })
	})
})
