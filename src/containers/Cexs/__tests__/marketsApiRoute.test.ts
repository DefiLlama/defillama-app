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

vi.mock('~/server/datasetCache/markets', () => ({
	fetchExchangeMarketsListFromCache: fetchExchangeMarketsListFromCacheMock
}))

import handler from '~/pages/api/public/markets/exchanges/[exchange]'

beforeEach(() => {
	vi.clearAllMocks()
	fetchExchangeMarketsListFromCacheMock.mockResolvedValue({
		last_updated: '2026-06-10T00:00:00Z',
		cex: {
			spot: [
				{
					exchange: 'binance',
					defillama_slug: 'Binance-CEX',
					market_count: 1,
					total_oi_prev_usd: null,
					total_oi_usd: null,
					total_volume_24h: 100,
					total_volume_prev_24h: 80
				}
			],
			linear_perp: [],
			inverse_perp: []
		},
		dex: {
			spot: [],
			linear_perp: [],
			inverse_perp: []
		},
		totals: {
			cex: {
				spot: {
					exchange_count: 1,
					total_oi_prev_usd: null,
					total_oi_usd: null,
					total_volume_24h: 100,
					total_volume_prev_24h: 80
				},
				linear_perp: {
					exchange_count: 0,
					total_oi_prev_usd: null,
					total_oi_usd: null,
					total_volume_24h: 0,
					total_volume_prev_24h: null
				},
				inverse_perp: {
					exchange_count: 0,
					total_oi_prev_usd: null,
					total_oi_usd: null,
					total_volume_24h: 0,
					total_volume_prev_24h: null
				}
			},
			dex: {
				spot: {
					exchange_count: 0,
					total_oi_prev_usd: null,
					total_oi_usd: null,
					total_volume_24h: 0,
					total_volume_prev_24h: null
				},
				linear_perp: {
					exchange_count: 0,
					total_oi_prev_usd: null,
					total_oi_usd: null,
					total_volume_24h: 0,
					total_volume_prev_24h: null
				},
				inverse_perp: {
					exchange_count: 0,
					total_oi_prev_usd: null,
					total_oi_usd: null,
					total_volume_24h: 0,
					total_volume_prev_24h: null
				}
			}
		}
	})
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
