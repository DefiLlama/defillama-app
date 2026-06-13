import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchExchangeMarketsFromNetworkMock, resolveMarketsExchangeByParamMock } = vi.hoisted(() => ({
	fetchExchangeMarketsFromNetworkMock: vi.fn(),
	resolveMarketsExchangeByParamMock: vi.fn()
}))

vi.mock('~/containers/Markets/server/upstream', () => ({
	fetchExchangeMarketsFromNetwork: fetchExchangeMarketsFromNetworkMock
}))

vi.mock('~/containers/Markets/server/dataset', () => ({
	resolveMarketsExchangeByParam: resolveMarketsExchangeByParamMock
}))

import handler from '~/pages/api/public/markets/exchanges/[exchange]'

beforeEach(() => {
	vi.clearAllMocks()
	resolveMarketsExchangeByParamMock.mockResolvedValue('binance')
	fetchExchangeMarketsFromNetworkMock.mockResolvedValue({
		categories: {},
		defillama_slug: 'Binance-CEX',
		exchange: 'binance',
		exchange_type: 'cex',
		last_updated: '2026-06-10T00:00:00Z',
		market_count: 1,
		market_types: ['spot'],
		supports_funding: false,
		supports_oi: false,
		total_oi_prev_usd: null,
		total_oi_usd: null,
		total_volume_24h: 100,
		total_volume_prev_24h: 80
	})
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

		expect(resolveMarketsExchangeByParamMock).toHaveBeenCalledWith('Binance')
		expect(fetchExchangeMarketsFromNetworkMock).toHaveBeenCalledWith('binance')
		expect(res.status).toHaveBeenCalledWith(200)
	})

	it('does not fetch exchange markets for unknown exchanges', async () => {
		resolveMarketsExchangeByParamMock.mockResolvedValueOnce(null)
		const req = { method: 'GET', query: { exchange: 'missing' } } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchExchangeMarketsFromNetworkMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'Exchange not found' })
	})
})
