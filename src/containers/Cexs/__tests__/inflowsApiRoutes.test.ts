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

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		cexs: [{ name: 'Binance', slug: 'Binance-CEX' }]
	}
}))

import inflowsHandler from '~/pages/api/private/cex/inflows'
import batchHandler from '~/pages/api/private/cex/inflows/batch'

beforeEach(() => {
	vi.clearAllMocks()
	validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: false })
	fetchWithPoolingOnServerMock.mockResolvedValue(new Response(JSON.stringify({ outflows: 1 })))
})

describe('/api/private/cex/inflows', () => {
	it('returns 405 with private no-store for non-GET requests', async () => {
		const req = {
			method: 'POST',
			headers: {},
			query: { slug: 'Binance', start: '1', end: '2' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
		expect(validateSubscriptionMock).not.toHaveBeenCalled()
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns auth failures before checking missing query params', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 401,
			error: 'Authentication required'
		})
		const req = {
			method: 'GET',
			headers: {},
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith(undefined)
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(401)
		expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns existing missing parameter errors after successful auth', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { slug: 'Binance', start: '1' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer ok')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Missing required parameters: slug, start, end' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns existing numeric parameter errors after successful auth', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { slug: 'Binance', start: 'bad', end: '2' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer ok')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'start and end must be valid numbers' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('authenticates before revealing unknown CEX slugs', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 403,
			error: 'Active subscription required'
		})
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { slug: 'unknown', start: '1', end: '2' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer bad')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'Active subscription required' })
	})

	it('does not fetch inflows for unknown CEX slugs after successful auth', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { slug: 'unknown', start: '1', end: '2' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer ok')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'CEX not found' })
	})

	it('returns CEX inflows with private no-store after successful auth', async () => {
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { slug: 'Binance', start: '1000', end: '2000', tokensToExclude: 'BNB' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer ok')
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith(
			'https://api.example.com/inflows/binance-cex/1000?end=2000&tokensToExclude=BNB'
		)
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ outflows: 1 })
	})

	it('passes through upstream error status with private no-store', async () => {
		fetchWithPoolingOnServerMock.mockResolvedValue(new Response(null, { status: 502 }))
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { slug: 'Binance', start: '1000', end: '2000' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith(
			'https://api.example.com/inflows/binance-cex/1000?end=2000&tokensToExclude='
		)
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(502)
		expect(res.json).toHaveBeenCalledWith({ error: 'Upstream API returned 502' })
	})

	it('returns the route-specific 500 body when auth validation throws', async () => {
		const error = new Error('Auth service unavailable')
		validateSubscriptionMock.mockRejectedValue(error)
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer bad' },
			query: { slug: 'Binance', start: '1', end: '2' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
	})

	it('returns the route-specific 500 body when fetching inflows throws', async () => {
		const error = new Error('Upstream unavailable')
		fetchWithPoolingOnServerMock.mockRejectedValue(error)
		const req = {
			method: 'GET',
			headers: { authorization: 'Bearer ok' },
			query: { slug: 'Binance', start: '1', end: '2' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await inflowsHandler(req, res)

		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
	})
})

describe('/api/private/cex/inflows/batch', () => {
	it('authenticates before revealing unknown CEX slugs', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 403,
			error: 'Active subscription required'
		})
		const req = {
			method: 'POST',
			headers: { authorization: 'Bearer bad' },
			body: { cexs: [{ slug: 'unknown' }], start: 1, end: 2 }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await batchHandler(req, res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer bad')
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(403)
	})
})
