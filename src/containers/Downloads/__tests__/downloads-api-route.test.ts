import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { extractItemsMock, fetchWithPoolingOnServerMock, validateSubscriptionMock } = vi.hoisted(() => ({
	extractItemsMock: vi.fn(),
	fetchWithPoolingOnServerMock: vi.fn(),
	validateSubscriptionMock: vi.fn()
}))

vi.mock('~/containers/Downloads/datasets', () => ({
	datasetsBySlug: new Map([
		[
			'protocols',
			{
				slug: 'protocols',
				name: 'Protocols',
				description: 'Protocol dataset',
				category: 'Protocol',
				url: 'https://datasets.example/protocols',
				fields: ['name', 'tvl'],
				extractItems: extractItemsMock
			}
		]
	])
}))

vi.mock('~/utils/apiAuth', () => ({
	validateSubscription: validateSubscriptionMock
}))

vi.mock('~/utils/http-client', () => ({
	fetchWithPoolingOnServer: fetchWithPoolingOnServerMock
}))

vi.mock('~/utils/telemetry', () => ({
	recordRouteRuntimeError: vi.fn(),
	withApiRouteTelemetry: (_route: string, handler: unknown) => handler
}))

import handler from '~/pages/api/private/downloads/[dataset]'

function downloadRequest(authHeader?: string): NextApiRequest {
	return {
		method: 'GET',
		headers: authHeader ? { authorization: authHeader } : {},
		query: { dataset: 'protocols' },
		url: '/api/private/downloads/protocols'
	} as unknown as NextApiRequest
}

const rows = Array.from({ length: 11 }, (_, index) => ({
	name: `item-${index + 1}`,
	tvl: index + 1
}))

beforeEach(() => {
	vi.clearAllMocks()
	extractItemsMock.mockImplementation((json) => json.items)
	fetchWithPoolingOnServerMock.mockResolvedValue({
		ok: true,
		status: 200,
		json: vi.fn().mockResolvedValue({ items: rows })
	})
})

describe('/api/private/downloads/[dataset]', () => {
	it('returns preview CSV rows without valid auth', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 401,
			error: 'Unauthorized'
		})
		const res = createMockNextApiResponse()

		await handler(downloadRequest(), res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith(undefined)
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://datasets.example/protocols')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('X-Preview', 'true')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('item-10'))
		expect(res.send).toHaveBeenCalledWith(expect.not.stringContaining('item-11'))
	})

	it('returns full CSV rows for paid auth', async () => {
		validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: false })
		const res = createMockNextApiResponse()

		await handler(downloadRequest('Bearer paid'), res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer paid')
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://datasets.example/protocols')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).not.toHaveBeenCalledWith('X-Preview', 'true')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('item-11'))
	})

	it('rejects trial full CSV downloads before fetching data', async () => {
		validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: true })
		const res = createMockNextApiResponse()

		await handler(downloadRequest('Bearer trial'), res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer trial')
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'CSV downloads are available only for paid users.' })
	})
})
