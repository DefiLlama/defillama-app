import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { getAssetMock, getChainsMock, getOverviewMock } = vi.hoisted(() => ({
	getAssetMock: vi.fn(),
	getChainsMock: vi.fn(),
	getOverviewMock: vi.fn()
}))

vi.mock('~/containers/Stablecoins/queries.server', () => ({
	getStablecoinAssetChartSeries: getAssetMock,
	getStablecoinChainsChartSeries: getChainsMock,
	getStablecoinOverviewChartSeries: getOverviewMock
}))

import handler from '~/pages/api/stablecoins/chart-series'

const payload = {
	dataset: { source: [{ timestamp: 1, Mcap: 2 }], dimensions: ['timestamp', 'Mcap'] },
	charts: [{ type: 'line', name: 'Mcap', encode: { x: 'timestamp', y: 'Mcap' } }],
	valueSymbol: '$'
}

beforeEach(() => {
	vi.clearAllMocks()
	getAssetMock.mockResolvedValue(payload)
	getChainsMock.mockResolvedValue(payload)
	getOverviewMock.mockResolvedValue(payload)
})

describe('/api/stablecoins/chart-series', () => {
	it('rejects non-GET requests', async () => {
		const req = { method: 'POST', query: {} } as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
	})

	it('passes overview filters to the server chart builder', async () => {
		const req = {
			method: 'GET',
			query: {
				scope: 'overview',
				chain: 'Ethereum',
				chart: 'tokenMcaps',
				attribute: ['STABLE', 'YIELDBEARING'],
				excludePegtype: 'PEGGEDEUR',
				minMcap: '100'
			}
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(getOverviewMock).toHaveBeenCalledWith({
			chain: 'Ethereum',
			chart: 'tokenMcaps',
			filters: {
				attribute: ['STABLE', 'YIELDBEARING'],
				excludeAttribute: undefined,
				pegtype: undefined,
				excludePegtype: 'PEGGEDEUR',
				backing: undefined,
				excludeBacking: undefined,
				minMcap: '100',
				maxMcap: undefined
			}
		})
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(payload)
	})

	it('returns 404 when an asset chart is missing', async () => {
		getAssetMock.mockResolvedValue(null)
		const req = {
			method: 'GET',
			query: { scope: 'asset', stablecoin: 'missing', chart: 'totalCirc' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'stablecoin not found' })
	})

	it('passes unreleased state to chains chart builder', async () => {
		const req = {
			method: 'GET',
			query: { scope: 'chains', chart: 'dominance', unreleased: 'true' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(getChainsMock).toHaveBeenCalledWith('dominance', true)
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(payload)
	})
})
