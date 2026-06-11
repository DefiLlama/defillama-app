import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchCoinGeckoChartByIdWithCacheFallbackMock, fetchJsonMock } = vi.hoisted(() => ({
	fetchCoinGeckoChartByIdWithCacheFallbackMock: vi.fn(),
	fetchJsonMock: vi.fn()
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
	recordRouteRuntimeError: vi.fn(),
	withApiRouteTelemetry: (_route: string, handler: unknown) => handler
}))

import handler from '~/pages/api/public/charts/coingecko/[geckoId]'

beforeEach(() => {
	vi.clearAllMocks()
})

describe('/api/public/charts/coingecko/[geckoId]', () => {
	it('normalizes finite supply values from the cache server', async () => {
		fetchJsonMock.mockResolvedValueOnce({ data: { total_supply: '123' } })
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'aave', kind: 'supply' },
				url: '/api/public/charts/coingecko/aave'
			} as unknown as NextApiRequest,
			res
		)

		expect(fetchCoinGeckoChartByIdWithCacheFallbackMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ totalSupply: 123 })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage='))
	})

	it('returns null supply for malformed cache server values', async () => {
		fetchJsonMock.mockResolvedValueOnce({ data: { total_supply: '1,234' } })
		const res = createMockNextApiResponse()

		await handler(
			{
				method: 'GET',
				query: { geckoId: 'aave', kind: 'supply' },
				url: '/api/public/charts/coingecko/aave'
			} as unknown as NextApiRequest,
			res
		)

		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({ totalSupply: null })
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
	})
})
