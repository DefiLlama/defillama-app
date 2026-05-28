import type { NextApiHandler, NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const {
	extractItemsMock,
	extractRowsMock,
	fetchWithPoolingOnServerMock,
	recordRouteRuntimeErrorMock,
	validateSubscriptionMock
} = vi.hoisted(() => ({
	extractItemsMock: vi.fn(),
	extractRowsMock: vi.fn(),
	fetchWithPoolingOnServerMock: vi.fn(),
	recordRouteRuntimeErrorMock: vi.fn(),
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
				chainFilterType: 'protocols',
				extractItems: extractItemsMock
			}
		]
	])
}))

vi.mock('~/containers/Downloads/chart-datasets', () => ({
	chartDatasetsBySlug: new Map([
		[
			'protocol-tvl-chart',
			{
				slug: 'protocol-tvl-chart',
				name: 'Protocol TVL',
				description: 'Protocol TVL chart',
				category: 'TVL',
				paramType: 'protocol',
				paramLabel: 'Protocol',
				optionsUrl: 'https://datasets.example/options',
				buildUrl: (param: string) => `https://charts.example/${param}`,
				extractRows: extractRowsMock,
				categoryBreakdown: { kind: 'tvl' }
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
	recordRouteRuntimeError: recordRouteRuntimeErrorMock,
	withApiRouteTelemetry: (_route: string, handler: NextApiHandler) => handler
}))

import datasetHandler from '~/pages/api/private/downloads/[dataset]'
import chartBreakdownHandler from '~/pages/api/private/downloads/chart-breakdown/[slug]'
import chartHandler from '~/pages/api/private/downloads/chart/[dataset]'

const datasetRows = Array.from({ length: 11 }, (_, index) => ({
	name: `item-${index + 1}`,
	tvl: index + 1,
	chains: index % 2 === 0 ? ['Ethereum'] : ['Arbitrum'],
	chainTvls: {
		Ethereum: { tvl: index % 2 === 0 ? index + 1 : 0 },
		Arbitrum: { tvl: index % 2 === 0 ? 0 : index + 1 }
	}
}))

const chartRows = Array.from({ length: 11 }, (_, index) => ({
	date: `day-${index + 1}`,
	value: index + 1
}))

const breakdownCsv = [
	['Protocol', ...Array.from({ length: 11 }, (_, index) => `${index + 1}/01/2024`)].join(','),
	['Aave', ...Array.from({ length: 11 }, (_, index) => String(index + 1))].join(',')
].join('\n')

function request({
	method = 'GET',
	query,
	auth
}: {
	method?: string
	query: Record<string, string>
	auth?: string
}): NextApiRequest {
	return {
		method,
		headers: auth ? { authorization: auth } : {},
		query
	} as unknown as NextApiRequest
}

function mockSuccessfulFetch() {
	fetchWithPoolingOnServerMock.mockResolvedValue({
		ok: true,
		status: 200,
		json: vi.fn().mockResolvedValue({ items: datasetRows, rows: chartRows }),
		text: vi.fn().mockResolvedValue(breakdownCsv)
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: false })
	extractItemsMock.mockImplementation((json) => json.items)
	extractRowsMock.mockImplementation((json) => json.rows)
	mockSuccessfulFetch()
})

describe('/api/private/downloads/[dataset]', () => {
	it('returns 405 with private no-store for non-GET requests', async () => {
		const res = createMockNextApiResponse()

		await datasetHandler(request({ method: 'POST', query: { dataset: 'protocols' } }), res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
		expect(validateSubscriptionMock).not.toHaveBeenCalled()
	})

	it('returns preview CSV rows without auth', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 401,
			error: 'Authentication required'
		})
		const res = createMockNextApiResponse()

		await datasetHandler(request({ query: { dataset: 'protocols' } }), res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith(undefined)
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://datasets.example/protocols')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('X-Preview', 'true')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('item-10'))
		expect(res.send).toHaveBeenCalledWith(expect.not.stringContaining('item-11'))
	})

	it('treats invalid subscriptions as preview access', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 403,
			error: 'Invalid subscription'
		})
		const res = createMockNextApiResponse()

		await datasetHandler(request({ query: { dataset: 'protocols' }, auth: 'Bearer bad' }), res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer bad')
		expect(res.setHeader).toHaveBeenCalledWith('X-Preview', 'true')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.send).toHaveBeenCalledWith(expect.not.stringContaining('item-11'))
	})

	it('returns full CSV rows for paid auth', async () => {
		const res = createMockNextApiResponse()

		await datasetHandler(request({ query: { dataset: 'protocols' }, auth: 'Bearer paid' }), res)

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

		await datasetHandler(request({ query: { dataset: 'protocols' }, auth: 'Bearer trial' }), res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer trial')
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'CSV downloads are available only for paid users.' })
	})

	it('allows trial users to fetch chain filter options', async () => {
		validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: true })
		const res = createMockNextApiResponse()

		await datasetHandler(request({ query: { dataset: 'protocols', mode: 'chains' }, auth: 'Bearer trial' }), res)

		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://datasets.example/protocols')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ chains: ['Ethereum', 'Arbitrum'] })
	})

	it('returns 500 with private no-store when auth validation throws', async () => {
		const error = new Error('auth unavailable')
		validateSubscriptionMock.mockRejectedValue(error)
		const res = createMockNextApiResponse()

		await datasetHandler(request({ query: { dataset: 'protocols' }, auth: 'Bearer paid' }), res)

		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
	})
})

describe('/api/private/downloads/chart/[dataset]', () => {
	it('returns preview chart CSV rows without auth', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 401,
			error: 'Authentication required'
		})
		const res = createMockNextApiResponse()

		await chartHandler(request({ query: { dataset: 'protocol-tvl-chart', param: 'aave' } }), res)

		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://charts.example/aave')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('X-Preview', 'true')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.send).toHaveBeenCalledWith(expect.not.stringContaining('day-1,1'))
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('day-11'))
	})

	it('returns full chart CSV rows for paid auth', async () => {
		const res = createMockNextApiResponse()

		await chartHandler(request({ query: { dataset: 'protocol-tvl-chart', param: 'aave' }, auth: 'Bearer paid' }), res)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer paid')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).not.toHaveBeenCalledWith('X-Preview', 'true')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('day-1,1'))
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('day-11'))
	})

	it('rejects trial chart CSV downloads before fetching data', async () => {
		validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: true })
		const res = createMockNextApiResponse()

		await chartHandler(request({ query: { dataset: 'protocol-tvl-chart', param: 'aave' }, auth: 'Bearer trial' }), res)

		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'CSV downloads are available only for paid users.' })
	})

	it('returns missing param errors before auth validation', async () => {
		const res = createMockNextApiResponse()

		await chartHandler(request({ query: { dataset: 'protocol-tvl-chart' } }), res)

		expect(validateSubscriptionMock).not.toHaveBeenCalled()
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Missing required "param" query parameter' })
	})
})

describe('/api/private/downloads/chart-breakdown/[slug]', () => {
	it('returns preview breakdown CSV rows without auth', async () => {
		validateSubscriptionMock.mockResolvedValue({
			valid: false,
			status: 401,
			error: 'Authentication required'
		})
		const res = createMockNextApiResponse()

		await chartBreakdownHandler(request({ query: { slug: 'protocol-tvl-chart', category: 'Lending' } }), res)

		expect(fetchWithPoolingOnServerMock).toHaveBeenCalled()
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).toHaveBeenCalledWith('X-Preview', 'true')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.send).toHaveBeenCalledWith(expect.not.stringContaining('2024-01-01'))
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('2024-01-11'))
	})

	it('returns full breakdown CSV rows for paid auth', async () => {
		const res = createMockNextApiResponse()

		await chartBreakdownHandler(
			request({ query: { slug: 'protocol-tvl-chart', category: 'Lending' }, auth: 'Bearer paid' }),
			res
		)

		expect(validateSubscriptionMock).toHaveBeenCalledWith('Bearer paid')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.setHeader).not.toHaveBeenCalledWith('X-Preview', 'true')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('2024-01-01'))
		expect(res.send).toHaveBeenCalledWith(expect.stringContaining('2024-01-11'))
	})

	it('rejects trial breakdown CSV downloads before fetching data', async () => {
		validateSubscriptionMock.mockResolvedValue({ valid: true, isTrial: true })
		const res = createMockNextApiResponse()

		await chartBreakdownHandler(
			request({ query: { slug: 'protocol-tvl-chart', category: 'Lending' }, auth: 'Bearer trial' }),
			res
		)

		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalled()
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'CSV downloads are available only for paid users.' })
	})
})
