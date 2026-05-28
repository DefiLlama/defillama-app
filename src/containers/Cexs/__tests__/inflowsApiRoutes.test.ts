import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchWithPoolingOnServerMock, validateSubscriptionMock } = vi.hoisted(() => ({
	fetchWithPoolingOnServerMock: vi.fn(),
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
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(403)
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
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'CEX not found' })
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
