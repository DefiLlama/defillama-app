import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchExchangeMarketsFromNetworkMock, fetchExchangeMarketsListFromCacheMock } = vi.hoisted(() => ({
	fetchExchangeMarketsFromNetworkMock: vi.fn(),
	fetchExchangeMarketsListFromCacheMock: vi.fn()
}))

vi.mock('~/containers/Cexs/api', () => ({
	fetchExchangeMarketsFromNetwork: fetchExchangeMarketsFromNetworkMock
}))

vi.mock('~/containers/Cexs/server/dataset.markets.cache', () => ({
	fetchExchangeMarketsListFromCache: fetchExchangeMarketsListFromCacheMock
}))

import handler from '~/pages/api/public/markets/exchanges/[exchange]'

beforeEach(() => {
	vi.clearAllMocks()
	fetchExchangeMarketsListFromCacheMock.mockResolvedValue({
		cex: {
			spot: [{ exchange: 'binance', defillama_slug: 'Binance-CEX', market_count: 1, total_volume_24h: 100 }],
			linear_perp: [],
			inverse_perp: []
		},
		dex: {
			spot: [],
			linear_perp: [],
			inverse_perp: []
		},
		totals: {}
	})
	fetchExchangeMarketsFromNetworkMock.mockResolvedValue({ exchange: 'binance', categories: {} })
})

describe('/api/public/markets/exchanges/[exchange]', () => {
	it('validates against the markets dataset and preserves the markets exchange id', async () => {
		const req = {
			method: 'GET',
			query: { exchange: 'Binance' },
			url: '/api/public/markets/exchanges/Binance'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchExchangeMarketsFromNetworkMock).toHaveBeenCalledWith('binance')
		expect(res.status).toHaveBeenCalledWith(200)
	})

	it('does not fetch exchange markets for unknown exchanges', async () => {
		const req = { method: 'GET', query: { exchange: 'missing' } } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchExchangeMarketsFromNetworkMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'Exchange not found' })
	})
})
