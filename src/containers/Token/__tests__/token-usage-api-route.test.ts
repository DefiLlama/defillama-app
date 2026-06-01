import type { NextApiHandler, NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchWithPoolingOnServerMock, recordRouteRuntimeErrorMock, validateSubscriptionMock } = vi.hoisted(() => ({
	fetchWithPoolingOnServerMock: vi.fn(),
	recordRouteRuntimeErrorMock: vi.fn(),
	validateSubscriptionMock: vi.fn()
}))

vi.mock('~/constants', () => ({
	SERVER_URL: 'https://api.example.com'
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

import tokenUsageHandler from '~/pages/api/private/token-usage/[symbol]'

beforeEach(() => {
	vi.clearAllMocks()
	validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: false })
	fetchWithPoolingOnServerMock.mockResolvedValue(new Response(JSON.stringify({ protocols: ['aave'] })))
})

describe('/api/private/token-usage/[symbol]', () => {
	it('returns 405 with private no-store for non-GET requests', async () => {
		const req = { method: 'POST', headers: {}, query: { symbol: 'eth' } } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUsageHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
		expect(validateSubscriptionMock).not.toHaveBeenCalled()
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns auth failures before checking missing symbol params', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 401,
			error: 'Authentication required'
		})
		const req = { method: 'GET', headers: {}, query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUsageHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith(undefined)
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(401)
		expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns 400 for missing symbols after successful auth', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUsageHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer ok')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Missing symbol parameter' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns token usage data with private no-store', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { symbol: 'eth' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUsageHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer ok')
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://api.example.com/tokenProtocols/ETH')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ protocols: ['aave'] })
	})

	it('passes through upstream error status and status text', async () => {
		fetchWithPoolingOnServerMock.mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' }))
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { symbol: 'missing' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUsageHandler(req, res)

		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://api.example.com/tokenProtocols/MISSING')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'Not Found' })
	})

	it('returns the route-specific 500 body when auth validation throws', async () => {
		const error = new Error('Auth service unavailable')
		validateSubscriptionMock.mockRejectedValue(error)
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { symbol: 'eth' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUsageHandler(req, res)

		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch token usage data' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns the route-specific 500 body when fetching token usage throws', async () => {
		const error = new Error('Upstream unavailable')
		fetchWithPoolingOnServerMock.mockRejectedValue(error)
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { symbol: 'eth' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await tokenUsageHandler(req, res)

		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch token usage data' })
	})
})
