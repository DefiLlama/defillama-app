import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchJsonMock, recordRouteRuntimeErrorMock } = vi.hoisted(() => ({
	fetchJsonMock: vi.fn(),
	recordRouteRuntimeErrorMock: vi.fn()
}))

vi.mock('~/constants', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/constants')>()
	return {
		...actual,
		MARKETS_SERVER_URL: 'https://markets.example.com'
	}
})

vi.mock('~/utils/async', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/utils/async')>()
	return {
		...actual,
		fetchJson: fetchJsonMock
	}
})

vi.mock('~/utils/telemetry', () => ({
	recordRouteRuntimeError: recordRouteRuntimeErrorMock,
	withApiRouteTelemetry: (_route: string, handler: unknown) => handler
}))

import handler from '~/pages/api/public/markets/[token]'

describe('/api/public/markets/[token]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('proxies token markets through the shared JSON route builder', async () => {
		fetchJsonMock.mockResolvedValueOnce({ token: 'btc', markets: [] })
		const req = {
			method: 'GET',
			query: { token: 'BTC' },
			url: '/api/public/markets/BTC'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchJsonMock).toHaveBeenCalledWith('https://markets.example.com/tokens/btc.json', { timeout: 30_000 })
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ token: 'btc', markets: [] })
	})

	it('keeps upstream 404s as token not found responses', async () => {
		fetchJsonMock.mockRejectedValueOnce(new Error('https://markets.example.com/tokens/missing.json: [404] Not Found'))
		const req = {
			method: 'GET',
			query: { token: 'missing' },
			url: '/api/public/markets/missing'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(recordRouteRuntimeErrorMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'Token not found' })
	})
})
