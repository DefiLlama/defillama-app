import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const {
	getProtocolsCategoriesChartDataMock,
	getChainsByCategoryChartDataMock,
	getChainsByAdapterAllChainsMock,
	getChainsByAdapterChartDataMock
} = vi.hoisted(() => ({
	getProtocolsCategoriesChartDataMock: vi.fn(),
	getChainsByCategoryChartDataMock: vi.fn(),
	getChainsByAdapterAllChainsMock: vi.fn(),
	getChainsByAdapterChartDataMock: vi.fn()
}))

vi.mock('~/containers/ProtocolsByCategoryOrTag/queries', () => ({
	getProtocolsCategoriesChartData: getProtocolsCategoriesChartDataMock
}))

vi.mock('~/containers/ChainsByCategory/queries', () => ({
	getChainsByCategoryChartData: getChainsByCategoryChartDataMock
}))

vi.mock('~/containers/DimensionAdapters/queries', () => ({
	getChainsByAdapterAllChains: getChainsByAdapterAllChainsMock,
	getChainsByAdapterChartData: getChainsByAdapterChartDataMock
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		chainMetadata: {
			ethereum: { id: 'ethereum', name: 'Ethereum', dexs: true }
		}
	}
}))

vi.mock('~/utils/telemetry', () => ({
	recordRouteRuntimeError: vi.fn(),
	withApiRouteTelemetry: (_route: string, handler: unknown) => handler
}))

import categoriesChartsHandler from '~/pages/api/public/page-data/categories/charts'
import chainsChartsHandler from '~/pages/api/public/page-data/chains/charts'
import dimensionAdapterChainsChartHandler from '~/pages/api/public/page-data/dimension-adapters/chains-chart'

describe('page data chart api routes', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns cacheable categories chart data', async () => {
		getProtocolsCategoriesChartDataMock.mockResolvedValue({
			chartSource: [{ timestamp: 1, Dexes: 100 }],
			extraTvlCharts: {}
		})
		const req = {
			method: 'GET',
			query: { extraTvlTypes: 'staking,borrowed' },
			url: '/api/public/page-data/categories/charts?extraTvlTypes=staking,borrowed'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await categoriesChartsHandler(req, res)

		expect(getProtocolsCategoriesChartDataMock).toHaveBeenCalledWith({
			extraTvlTypes: ['staking', 'borrowed']
		})
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public, s-maxage='))
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			chartSource: [{ timestamp: 1, Dexes: 100 }],
			extraTvlCharts: {}
		})
	})

	it('returns cacheable categories chart data from repeated extra tvl query params', async () => {
		getProtocolsCategoriesChartDataMock.mockResolvedValue({
			chartSource: [{ timestamp: 1, Dexes: 100 }],
			extraTvlCharts: {}
		})
		const req = {
			method: 'GET',
			query: { extraTvlTypes: ['staking', 'borrowed'] },
			url: '/api/public/page-data/categories/charts?extraTvlTypes=staking&extraTvlTypes=borrowed'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await categoriesChartsHandler(req, res)

		expect(getProtocolsCategoriesChartDataMock).toHaveBeenCalledWith({
			extraTvlTypes: ['staking', 'borrowed']
		})
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public, s-maxage='))
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			chartSource: [{ timestamp: 1, Dexes: 100 }],
			extraTvlCharts: {}
		})
	})

	it('returns cacheable chains chart data', async () => {
		getChainsByCategoryChartDataMock.mockResolvedValue({
			tvlChartsByChain: { tvl: { Ethereum: { 1: 100 } } },
			totalTvlByDate: { tvl: { 1: 100 } }
		})
		const req = {
			method: 'GET',
			query: { category: 'All', sampledChart: 'true', extraTvlTypes: 'staking,borrowed' },
			url: '/api/public/page-data/chains/charts?category=All&sampledChart=true&extraTvlTypes=staking,borrowed'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await chainsChartsHandler(req, res)

		expect(getChainsByCategoryChartDataMock).toHaveBeenCalledWith({
			category: 'All',
			sampledChart: true,
			extraTvlTypes: ['staking', 'borrowed']
		})
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public, s-maxage='))
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			tvlChartsByChain: { tvl: { Ethereum: { 1: 100 } } },
			totalTvlByDate: { tvl: { 1: 100 } }
		})
	})

	it('returns cacheable chains chart data from repeated extra tvl query params', async () => {
		getChainsByCategoryChartDataMock.mockResolvedValue({
			tvlChartsByChain: { tvl: { Ethereum: { 1: 100 } } },
			totalTvlByDate: { tvl: { 1: 100 } }
		})
		const req = {
			method: 'GET',
			query: { category: 'All', sampledChart: 'true', extraTvlTypes: ['staking', 'borrowed'] },
			url: '/api/public/page-data/chains/charts?category=All&sampledChart=true&extraTvlTypes=staking&extraTvlTypes=borrowed'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await chainsChartsHandler(req, res)

		expect(getChainsByCategoryChartDataMock).toHaveBeenCalledWith({
			category: 'All',
			sampledChart: true,
			extraTvlTypes: ['staking', 'borrowed']
		})
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public, s-maxage='))
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			tvlChartsByChain: { tvl: { Ethereum: { 1: 100 } } },
			totalTvlByDate: { tvl: { 1: 100 } }
		})
	})

	it('rejects unsupported dimension adapter chart params', async () => {
		const req = {
			method: 'GET',
			query: { adapterType: 'bad', dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await dimensionAdapterChainsChartHandler(req, res)

		expect(getChainsByAdapterChartDataMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'unsupported adapterType or dataType' })
	})

	it('returns cacheable dimension adapter chart data', async () => {
		getChainsByAdapterAllChainsMock.mockReturnValue(['Ethereum'])
		getChainsByAdapterChartDataMock.mockResolvedValue({
			dimensions: ['timestamp', 'Ethereum'],
			source: [{ timestamp: 1, Ethereum: 100 }]
		})
		const req = {
			method: 'GET',
			query: { adapterType: ADAPTER_TYPES.DEXS, dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME },
			url: '/api/public/page-data/dimension-adapters/chains-chart?adapterType=dexs&dataType=dailyVolume'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await dimensionAdapterChainsChartHandler(req, res)

		expect(getChainsByAdapterAllChainsMock).toHaveBeenCalledWith({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chainMetadata: { ethereum: { id: 'ethereum', name: 'Ethereum', dexs: true } }
		})
		expect(getChainsByAdapterChartDataMock).toHaveBeenCalledWith({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			allChains: ['Ethereum']
		})
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public, s-maxage='))
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			chartData: {
				dimensions: ['timestamp', 'Ethereum'],
				source: [{ timestamp: 1, Ethereum: 100 }]
			}
		})
	})

	it('does not cache failed dimension adapter chart responses', async () => {
		getChainsByAdapterAllChainsMock.mockReturnValue(['Ethereum'])
		getChainsByAdapterChartDataMock.mockRejectedValue(new Error('upstream failed'))
		const req = {
			method: 'GET',
			query: { adapterType: ADAPTER_TYPES.DEXS, dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME },
			url: '/api/public/page-data/dimension-adapters/chains-chart?adapterType=dexs&dataType=dailyVolume'
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await dimensionAdapterChainsChartHandler(req, res)

		expect(res.setHeader).not.toHaveBeenCalledWith('Cache-Control', expect.any(String))
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch dimension adapter chart data' })
	})
})
