import type { NextApiRequest } from 'next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { runtimeMocks } = vi.hoisted(() => ({
	runtimeMocks: {
		getYieldLoopPage: vi.fn(),
		getYieldStrategyPage: vi.fn(),
		getYieldLongShortPage: vi.fn(),
		getYieldHalalPage: vi.fn()
	}
}))

vi.mock('~/containers/Yields/server/dataset', () => runtimeMocks)

import halalHandler from '~/pages/api/public/datasets/yields/halal'
import loopHandler from '~/pages/api/public/datasets/yields/loop'
import strategyHandler from '~/pages/api/public/datasets/yields/strategy'
import longShortHandler from '~/pages/api/public/datasets/yields/strategy-long-short'

const response = {
	rows: [{ pool: 'ETH-USDC' }],
	total: 1,
	page: 1,
	pageSize: 50,
	hasMore: false
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '0')
	for (const mock of Object.values(runtimeMocks)) {
		mock.mockResolvedValue(response)
	}
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('route-specific yield table api routes', () => {
	it.each([
		{
			name: 'loop',
			path: '/api/public/datasets/yields/loop',
			handler: loopHandler,
			runtime: runtimeMocks.getYieldLoopPage
		},
		{
			name: 'strategy',
			path: '/api/public/datasets/yields/strategy',
			handler: strategyHandler,
			runtime: runtimeMocks.getYieldStrategyPage
		},
		{
			name: 'strategy-long-short',
			path: '/api/public/datasets/yields/strategy-long-short',
			handler: longShortHandler,
			runtime: runtimeMocks.getYieldLongShortPage
		},
		{
			name: 'halal',
			path: '/api/public/datasets/yields/halal',
			handler: halalHandler,
			runtime: runtimeMocks.getYieldHalalPage
		}
	])('serves $name rows with CDN cache headers', async ({ path, handler, runtime }) => {
		const req = {
			method: 'GET',
			url: `${path}?page=2&pageSize=10&sortBy=apy&sortDesc=false&token=ETH`,
			query: {
				page: '2',
				pageSize: '10',
				sortBy: 'apy',
				sortDesc: 'false',
				token: 'ETH'
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(runtime).toHaveBeenCalledWith({
			page: '2',
			pageSize: '10',
			sortBy: 'apy',
			sortDesc: 'false',
			token: 'ETH'
		})
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(response)
	})

	it('rejects non-GET halal requests before loading rows', async () => {
		const req = {
			method: 'POST',
			url: '/api/public/datasets/yields/halal',
			query: {}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await halalHandler(req, res)

		expect(runtimeMocks.getYieldHalalPage).not.toHaveBeenCalled()
		expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET')
		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
	})
})
