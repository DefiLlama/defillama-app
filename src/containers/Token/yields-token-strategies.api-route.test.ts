import type { NextApiRequest, NextApiResponse } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getTokenStrategiesDataMock = vi.fn()

vi.mock('~/containers/Token/tokenStrategies.server', () => ({
	getTokenStrategiesData: getTokenStrategiesDataMock
}))

import handler from '~/pages/api/datasets/yields-token-strategies'

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
	getTokenStrategiesDataMock.mockResolvedValue({
		borrowAsCollateral: [{ symbol: 'ETH' }],
		borrowAsDebt: [{ borrow: { symbol: 'ETH' } }],
		longShort: [{ symbolPerp: 'ETH-PERP' }]
	})
})

describe('yields-token-strategies api route', () => {
	it('delegates to the shared strategies loader and sets cache headers', async () => {
		const req = {
			method: 'GET',
			query: { token: 'ETH' }
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(getTokenStrategiesDataMock).toHaveBeenCalledWith('ETH')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			borrowAsCollateral: [{ symbol: 'ETH' }],
			borrowAsDebt: [{ borrow: { symbol: 'ETH' } }],
			longShort: [{ symbolPerp: 'ETH-PERP' }]
		})
	})
})
