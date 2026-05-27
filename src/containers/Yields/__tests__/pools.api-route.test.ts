import type { NextApiRequest } from 'next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { getYieldPoolsPageMock } = vi.hoisted(() => ({
	getYieldPoolsPageMock: vi.fn()
}))

vi.mock('~/server/datasetCache/runtime/yields', () => ({
	getYieldPoolsPage: getYieldPoolsPageMock
}))

import handler from '~/pages/api/datasets/yields/pools'

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '0')
	getYieldPoolsPageMock.mockResolvedValue({
		rows: [{ pool: 'ETH-USDC' }],
		total: 1,
		page: 1,
		pageSize: 50,
		hasMore: false
	})
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('yield pools api route', () => {
	it('serves filtered pool table rows with CDN cache headers', async () => {
		const req = {
			method: 'GET',
			url: '/api/datasets/yields/pools?view=main&page=1&pageSize=50',
			query: { view: 'main', page: '1', pageSize: '50' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(getYieldPoolsPageMock).toHaveBeenCalledWith({ view: 'main', page: '1', pageSize: '50' })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			rows: [{ pool: 'ETH-USDC' }],
			total: 1,
			page: 1,
			pageSize: 50,
			hasMore: false
		})
	})
})
