import type { NextApiHandler, NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const {
	getProtocolEmissonsMock,
	isEmptyProtocolEmissionResultMock,
	recordRouteRuntimeErrorMock,
	refreshMetadataInBackgroundIfStaleMock,
	resolveProtocolParamFromMetadataMock,
	validateSubscriptionMock
} = vi.hoisted(() => ({
	getProtocolEmissonsMock: vi.fn(),
	isEmptyProtocolEmissionResultMock: vi.fn(),
	recordRouteRuntimeErrorMock: vi.fn(),
	refreshMetadataInBackgroundIfStaleMock: vi.fn(),
	resolveProtocolParamFromMetadataMock: vi.fn(),
	validateSubscriptionMock: vi.fn()
}))

vi.mock('~/containers/Unlocks/queries', () => ({
	getProtocolEmissons: getProtocolEmissonsMock,
	isEmptyProtocolEmissionResult: isEmptyProtocolEmissionResultMock
}))

vi.mock('~/containers/ProtocolOverview/server/routes', () => ({
	resolveProtocolParamFromMetadata: resolveProtocolParamFromMetadataMock
}))

vi.mock('~/utils/apiAuth', () => ({
	validateSubscription: validateSubscriptionMock
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		emissionsProtocolsList: ['aave'],
		tokenlist: { aave: { symbol: 'AAVE' } }
	},
	refreshMetadataInBackgroundIfStale: refreshMetadataInBackgroundIfStaleMock
}))

vi.mock('~/utils/telemetry', () => ({
	recordRouteRuntimeError: recordRouteRuntimeErrorMock,
	withApiRouteTelemetry: (_route: string, handler: NextApiHandler) => handler
}))

import tokenUnlocksHandler from '~/pages/api/private/token-unlocks/[protocol]'

beforeEach(() => {
	vi.clearAllMocks()
	validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: false })
	resolveProtocolParamFromMetadataMock.mockReturnValue({ canonicalSlug: 'aave' })
	getProtocolEmissonsMock.mockResolvedValue({ protocol: 'aave' })
	isEmptyProtocolEmissionResultMock.mockReturnValue(false)
})

describe('/api/private/token-unlocks/[protocol]', () => {
	it('returns 405 with private no-store for non-GET requests', async () => {
		const req = { method: 'POST', headers: {}, query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUnlocksHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
		expect(validateSubscriptionMock).not.toHaveBeenCalled()
	})

	it('authenticates before returning 400 for missing protocol params', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUnlocksHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer ok')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Missing protocol parameter' })
	})

	it('returns auth failures before checking missing protocol params', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 401,
			error: 'Authentication required'
		})
		const req = { method: 'GET', headers: {}, query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUnlocksHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith(undefined)
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(401)
		expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
	})

	it('returns subscription failures with private no-store', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 403,
			error: 'Active subscription required'
		})
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { protocol: 'aave' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUnlocksHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer bad')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'Active subscription required' })
	})

	it('returns 404 with private no-store for unavailable protocols', async () => {
		resolveProtocolParamFromMetadataMock.mockReturnValue(null)
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { protocol: 'missing' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUnlocksHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'Protocol emissions not found' })
		expect(getProtocolEmissonsMock).not.toHaveBeenCalled()
	})

	it('returns unlock data with private no-store', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { protocol: 'aave' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUnlocksHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(getProtocolEmissonsMock).toHaveBeenCalledWith('aave', {
			skipAvailabilityCheck: true,
			tokenlist: { aave: { symbol: 'AAVE' } }
		})
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ protocol: 'aave' })
	})

	it('returns 500 with private no-store when auth validation throws', async () => {
		const error = new Error('Auth service unavailable')
		validateSubscriptionMock.mockRejectedValue(error)
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { protocol: 'aave' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUnlocksHandler(req, res)

		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
	})
})
