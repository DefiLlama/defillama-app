import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { getTokenYieldsRowsMock } = vi.hoisted(() => ({
	getTokenYieldsRowsMock: vi.fn()
}))

vi.mock('~/containers/Token/tokenYields.server', () => ({
	getTokenYieldsRowsFromNetwork: getTokenYieldsRowsMock
}))

import handler from '~/pages/api/datasets/yields'

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
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(getTokenYieldsRowsMock).toHaveBeenCalledWith('ETH', 'Ethereum')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith([{ pool: 'ETH-USDC' }])
	})
})
