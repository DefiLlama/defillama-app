import type { NextApiRequest } from 'next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { getBorrowAdvancedPageRowsMock } = vi.hoisted(() => ({
	getBorrowAdvancedPageRowsMock: vi.fn()
}))

vi.mock('~/containers/Yields/server/dataset', () => ({
	getBorrowAdvancedPageRows: getBorrowAdvancedPageRowsMock
}))

import handler from '~/pages/api/public/yields/borrow-advanced'

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '0')
	getBorrowAdvancedPageRowsMock.mockResolvedValue([{ pool: 'eth-collateral' }])
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('borrow advanced api route', () => {
	it('serves filtered borrow optimizer rows with CDN cache headers', async () => {
		const req = {
			method: 'GET',
			url: '/api/public/yields/borrow-advanced?lend=ETH&borrow=USDC',
			query: { lend: 'ETH', borrow: 'USDC' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(getBorrowAdvancedPageRowsMock).toHaveBeenCalledWith({ lend: 'ETH', borrow: 'USDC' })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith([{ pool: 'eth-collateral' }])
	})
})
