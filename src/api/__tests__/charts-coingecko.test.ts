import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchCoinGeckoChartByIdWithCacheFallbackMock, fetchJsonMock, recordRouteRuntimeErrorMock } = vi.hoisted(() => ({
	fetchCoinGeckoChartByIdWithCacheFallbackMock: vi.fn(),
	fetchJsonMock: vi.fn(),
	recordRouteRuntimeErrorMock: vi.fn()
}))

vi.mock('~/api/coingecko', () => ({
	fetchCoinGeckoChartByIdWithCacheFallback: fetchCoinGeckoChartByIdWithCacheFallbackMock
}))

vi.mock('~/utils/async', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/utils/async')>()
	return {
		...actual,
		fetchJson: fetchJsonMock
	}
})

vi.mock('~/utils/telemetry', () => ({
	recordRouteRuntimeError: recordRouteRuntimeErrorMock,
	withApiRouteTelemetry: (_route: string, handler: unknown) => handler
}))

import handler from '~/pages/api/public/tokens/charts/coingecko/[geckoId]'

beforeEach(() => {
	vi.clearAllMocks()
})

describe('/api/public/tokens/charts/coingecko/[geckoId]', () => {
	it('returns cached chart data for valid CoinGecko ids with allowed punctuation', async () => {
		fetchCoinGeckoChartByIdWithCacheFallbackMock.mockResolvedValueOnce({ data: { prices: [[1, 2]] } })
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'wrapped-bitcoin_2.test-token' },
				url: '/api/public/tokens/charts/coingecko/wrapped-bitcoin_2.test-token'
			} as unknown as NextApiRequest,
			res
		)

		expect(fetchCoinGeckoChartByIdWithCacheFallbackMock).toHaveBeenCalledWith('wrapped-bitcoin_2.test-token', {
			fullChart: true
		})
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ data: { prices: [[1, 2]] } })
	})

	it('rejects invalid CoinGecko ids before fetching upstream data', async () => {
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'bad id' },
				url: '/api/public/tokens/charts/coingecko/bad%20id'
			} as unknown as NextApiRequest,
			res
		)

		expect(fetchCoinGeckoChartByIdWithCacheFallbackMock).not.toHaveBeenCalled()
		expect(fetchJsonMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'Invalid geckoId parameter' })
	})

	it('normalizes finite supply values from the cache server', async () => {
		fetchJsonMock.mockResolvedValueOnce({ data: { total_supply: 123 } })
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'aave', kind: 'supply' },
				url: '/api/public/tokens/charts/coingecko/aave'
			} as unknown as NextApiRequest,
			res
		)

		expect(fetchCoinGeckoChartByIdWithCacheFallbackMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ totalSupply: 123 })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage='))
	})

	it('returns null supply when the cache server has no supply value', async () => {
		fetchJsonMock.mockResolvedValueOnce({ data: {} })
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'aave', kind: 'supply' },
				url: '/api/public/tokens/charts/coingecko/aave'
			} as unknown as NextApiRequest,
			res
		)

		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ totalSupply: null })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
	})

	it('returns null supply when the cache server returns a non-finite supply value', async () => {
		fetchJsonMock.mockResolvedValueOnce({ data: { total_supply: Infinity } })
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'aave', kind: 'supply' },
				url: '/api/public/tokens/charts/coingecko/aave'
			} as unknown as NextApiRequest,
			res
		)

		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ totalSupply: null })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
	})

	it('returns null supply when the cache server has no supply record', async () => {
		fetchJsonMock.mockRejectedValueOnce(new Error('https://cache.llama.fi/supply/missing: [404] Not Found'))
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'missing', kind: 'supply' },
				url: '/api/public/tokens/charts/coingecko/missing'
			} as unknown as NextApiRequest,
			res
		)

		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ totalSupply: null })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
		expect(recordRouteRuntimeErrorMock).not.toHaveBeenCalled()
	})

	it('reports cache server failures when loading supply fails for a reason other than not found', async () => {
		const error = new Error('https://cache.llama.fi/supply/aave: [500] Upstream unavailable')
		fetchJsonMock.mockRejectedValueOnce(error)
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'aave', kind: 'supply' },
				url: '/api/public/tokens/charts/coingecko/aave'
			} as unknown as NextApiRequest,
			res
		)

		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load coingecko chart data' })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
		expect(recordRouteRuntimeErrorMock).toHaveBeenCalledWith(error, 'apiRoute')
	})
})
