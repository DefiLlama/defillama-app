import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const {
	fetchAdapterChainChartDataMock,
	fetchAdapterProtocolChartDataMock,
	resolveProtocolParamMock,
	fetchChainAssetsChartMock,
	getBridgeOverviewPageDataMock,
	fetchRaisesMock,
	getStablecoinOverviewChartSeriesMock,
	getProtocolUnlockUsdChartMock
} = vi.hoisted(() => ({
	fetchAdapterChainChartDataMock: vi.fn(),
	fetchAdapterProtocolChartDataMock: vi.fn(),
	resolveProtocolParamMock: vi.fn(),
	fetchChainAssetsChartMock: vi.fn(),
	getBridgeOverviewPageDataMock: vi.fn(),
	fetchRaisesMock: vi.fn(),
	getStablecoinOverviewChartSeriesMock: vi.fn(),
	getProtocolUnlockUsdChartMock: vi.fn()
}))

vi.mock('~/containers/BridgedTVL/api', () => ({
	fetchChainAssetsChart: fetchChainAssetsChartMock
}))

vi.mock('~/containers/Bridges/queries.server', () => ({
	getBridgeOverviewPageData: getBridgeOverviewPageDataMock
}))

vi.mock('~/containers/DimensionAdapters/api', () => ({
	fetchAdapterChainChartData: fetchAdapterChainChartDataMock,
	fetchAdapterProtocolChartData: fetchAdapterProtocolChartDataMock
}))

vi.mock('~/containers/Raises/api', () => ({
	fetchRaises: fetchRaisesMock
}))

vi.mock('~/containers/Stablecoins/queries.server', () => ({
	getStablecoinOverviewChartSeries: getStablecoinOverviewChartSeriesMock
}))

vi.mock('~/containers/Unlocks/queries', () => ({
	getProtocolUnlockUsdChart: getProtocolUnlockUsdChartMock
}))

vi.mock('~/server/routeCache/protocols', () => ({
	resolveProtocolParam: resolveProtocolParamMock
}))

import handler from '~/pages/api/public/charts/chain'

beforeEach(() => {
	vi.clearAllMocks()
	fetchAdapterChainChartDataMock.mockResolvedValue([])
	fetchAdapterProtocolChartDataMock.mockResolvedValue([])
	resolveProtocolParamMock.mockResolvedValue({ canonicalSlug: 'aave', id: '1', metadata: { displayName: 'Aave' } })
})

describe('/api/public/charts/chain', () => {
	it('canonicalizes adapter protocol chart requests before fetching', async () => {
		const req = {
			method: 'GET',
			query: { kind: 'adapter-protocol', adapterType: 'fees', protocol: 'Aave V3' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchAdapterProtocolChartDataMock).toHaveBeenCalledWith({ adapterType: 'fees', protocol: 'aave' })
		expect(res.status).toHaveBeenCalledWith(200)
	})

	it('does not fetch adapter protocol charts for unknown protocols', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		const req = {
			method: 'GET',
			query: { kind: 'adapter-protocol', adapterType: 'fees', protocol: 'missing' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchAdapterProtocolChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it('accepts lowercase all for adapter chain charts', async () => {
		const req = {
			method: 'GET',
			query: { kind: 'adapter-chain', adapterType: 'fees', chain: 'all' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchAdapterChainChartDataMock).toHaveBeenCalledWith({ adapterType: 'fees', chain: 'All' })
		expect(res.status).toHaveBeenCalledWith(200)
	})
})
