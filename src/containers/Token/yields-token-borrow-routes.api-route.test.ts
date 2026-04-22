import type { NextApiRequest, NextApiResponse } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getTokenBorrowRoutesDataMock } = vi.hoisted(() => ({
	getTokenBorrowRoutesDataMock: vi.fn()
}))

vi.mock('~/containers/Token/tokenBorrowRoutes.server', () => ({
	getTokenBorrowRoutesData: getTokenBorrowRoutesDataMock
}))

import handler from '~/pages/api/datasets/yields-token-borrow-routes'

function createRes() {
	const res: Partial<NextApiResponse> = {
		setHeader: vi.fn(),
		status: vi.fn(),
		json: vi.fn()
	}

	;(res.status as ReturnType<typeof vi.fn>).mockImplementation(() => res as NextApiResponse)
	;(res.json as ReturnType<typeof vi.fn>).mockImplementation(() => res as NextApiResponse)

	return res as NextApiResponse
}

beforeEach(() => {
	vi.clearAllMocks()
	getTokenBorrowRoutesDataMock.mockResolvedValue({
		borrowAsCollateral: [{ symbol: 'ETH' }],
		borrowAsDebt: [{ borrow: { symbol: 'ETH' } }]
	})
})

describe('yields-token-borrow-routes api route', () => {
	it('delegates to the shared borrow routes loader and sets cache headers', async () => {
		const req = {
			method: 'GET',
			query: { token: 'ETH' }
		} as unknown as NextApiRequest
		const res = createRes()

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
