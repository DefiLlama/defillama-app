import type { NextApiRequest, NextApiResponse } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getTokenYieldsRowsMock = vi.fn()

vi.mock('~/containers/Token/tokenYields.server', () => ({
	getTokenYieldsRows: getTokenYieldsRowsMock
}))

import handler from '~/pages/api/datasets/yields'

function createRes() {
	const res: Partial<NextApiResponse> = {
		status: vi.fn(),
		json: vi.fn()
	}

	;(res.status as ReturnType<typeof vi.fn>).mockImplementation(() => res as NextApiResponse)
	;(res.json as ReturnType<typeof vi.fn>).mockImplementation(() => res as NextApiResponse)

	return res as NextApiResponse
}

beforeEach(() => {
	vi.clearAllMocks()
	getTokenYieldsRowsMock.mockResolvedValue([{ pool: 'ETH-USDC' }])
})

describe('yields api route', () => {
	it('delegates to the shared token yields loader', async () => {
		const req = {
			method: 'GET',
			query: { token: 'ETH', chains: 'Ethereum' }
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(getTokenYieldsRowsMock).toHaveBeenCalledWith('ETH', 'Ethereum')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith([{ pool: 'ETH-USDC' }])
	})
})
