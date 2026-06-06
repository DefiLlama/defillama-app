import type { NextApiHandler, NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchWithPoolingOnServerMock, recordRouteRuntimeErrorMock, validateSubscriptionMock } = vi.hoisted(() => ({
	fetchWithPoolingOnServerMock: vi.fn(),
	recordRouteRuntimeErrorMock: vi.fn(),
	validateSubscriptionMock: vi.fn()
}))

vi.mock('~/utils/apiAuth', () => ({
	validateSubscription: validateSubscriptionMock
}))

vi.mock('~/utils/http-client', () => ({
	fetchWithPoolingOnServer: fetchWithPoolingOnServerMock
}))

vi.mock('~/utils/telemetry', () => ({
	recordRouteRuntimeError: recordRouteRuntimeErrorMock,
	withApiRouteTelemetry: (_route: string, handler: NextApiHandler) => handler
}))

import volatilityHandler from '~/pages/api/private/datasets/volatility'

beforeEach(() => {
	vi.clearAllMocks()
	validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: false })
	fetchWithPoolingOnServerMock.mockResolvedValue(new Response(JSON.stringify({ pool: [null, 4.4, 0.9, 0.2] })))
})

describe('/api/private/datasets/volatility', () => {
	it('returns 405 with private no-store for non-GET requests', async () => {
		const req = { method: 'POST', headers: {}, query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await volatilityHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
		expect(validateSubscriptionMock).not.toHaveBeenCalled()
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns auth failures with private no-store', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 403,
			error: 'Active subscription required'
		})
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await volatilityHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer bad')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'Active subscription required' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns volatility data with private no-store', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await volatilityHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer ok')
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://yields.llama.fi/volatility')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ pool: [null, 4.4, 0.9, 0.2] })
	})

	it('returns 502 with private no-store for upstream failures', async () => {
		fetchWithPoolingOnServerMock.mockResolvedValue(new Response(null, { status: 503 }))
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await volatilityHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(502)
		expect(res.json).toHaveBeenCalledWith({ error: 'Upstream error' })
	})

	it('returns 500 with private no-store when auth validation throws', async () => {
		const error = new Error('Auth service unavailable')
		validateSubscriptionMock.mockRejectedValue(error)
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await volatilityHandler(req, res)

		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns 500 with private no-store when fetching volatility throws', async () => {
		const error = new Error('Upstream unavailable')
		fetchWithPoolingOnServerMock.mockRejectedValue(error)
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await volatilityHandler(req, res)

		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
	})
})
