import type { NextApiRequest, NextApiResponse } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/containers/LiquidationsV2/queries', () => ({
	getLiquidationsOverviewPageData: vi.fn(),
	getLiquidationsProtocolPageData: vi.fn(),
	getLiquidationsChainPageData: vi.fn()
}))

vi.mock('~/utils/apiAuth', () => ({
	validateSubscription: vi.fn()
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		chainMetadata: {},
		protocolMetadata: {}
	},
	refreshMetadataIfStale: vi.fn().mockResolvedValue(undefined)
}))

import {
	getLiquidationsChainPageData,
	getLiquidationsOverviewPageData,
	getLiquidationsProtocolPageData
} from '~/containers/LiquidationsV2/queries'
import chainHandler from '~/pages/api/liquidations/[protocol]/[chain]'
import protocolHandler from '~/pages/api/liquidations/[protocol]/index'
import overviewHandler from '~/pages/api/liquidations/index'
import { validateSubscription } from '~/utils/apiAuth'

const mockedValidateSubscription = validateSubscription as unknown as ReturnType<typeof vi.fn>
const mockedGetLiquidationsOverviewPageData = getLiquidationsOverviewPageData as unknown as ReturnType<typeof vi.fn>
const mockedGetLiquidationsProtocolPageData = getLiquidationsProtocolPageData as unknown as ReturnType<typeof vi.fn>
const mockedGetLiquidationsChainPageData = getLiquidationsChainPageData as unknown as ReturnType<typeof vi.fn>

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
	mockedValidateSubscription.mockResolvedValue({ valid: true, isTrial: false })
})

describe('liquidations api routes', () => {
	it('returns 405 for non-GET overview requests', async () => {
		const req = { method: 'POST', headers: {} } as NextApiRequest
		const res = createRes()

		await overviewHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
	})

	it('returns 403 for unauthorized protocol requests', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { protocol: 'sky' }
		} as unknown as NextApiRequest
		const res = createRes()
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

	it('returns overview data for authorized requests', async () => {
		const req = { method: 'GET', headers: { authorization: 'Bearer ok' }, query: {} } as unknown as NextApiRequest
		const res = createRes()
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
		const res = createRes()
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

	it('returns a 500 json error when overview auth validation throws', async () => {
		const req = { method: 'GET', headers: { authorization: 'Bearer bad' }, query: {} } as unknown as NextApiRequest
		const res = createRes()
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
		const res = createRes()
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
		const res = createRes()
		mockedValidateSubscription.mockRejectedValue(new Error('Auth service unavailable'))

		await chainHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch liquidations chain data' })
	})
})
