import type { NextApiRequest } from 'next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { getTokenBorrowRoutesDataMock } = vi.hoisted(() => ({
	getTokenBorrowRoutesDataMock: vi.fn()
}))

vi.mock('~/containers/Token/tokenBorrowRoutes.server', () => ({
	getTokenBorrowRoutesDataFromNetwork: getTokenBorrowRoutesDataMock
}))

import handler from '~/pages/api/datasets/yields-token-borrow-routes'

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '0')
	getTokenBorrowRoutesDataMock.mockResolvedValue({
		borrowAsCollateral: [{ symbol: 'ETH' }],
		borrowAsDebt: [{ borrow: { symbol: 'ETH' } }]
	})
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('yields-token-borrow-routes api route', () => {
	it('delegates to the shared borrow routes loader and sets cache headers', async () => {
		const req = {
			method: 'GET',
			query: { token: 'ETH' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(getTokenBorrowRoutesDataMock).toHaveBeenCalledWith('ETH')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			borrowAsCollateral: [{ symbol: 'ETH' }],
			borrowAsDebt: [{ borrow: { symbol: 'ETH' } }]
		})
	})
})
