import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	fetchWithPoolingOnServer: vi.fn(),
	fetchProtocols: vi.fn()
}))

vi.mock('~/utils/http-client', () => ({
	fetchWithPoolingOnServer: mocks.fetchWithPoolingOnServer
}))

vi.mock('~/containers/ProtocolLists/api', () => ({
	fetchProtocols: mocks.fetchProtocols
}))

function jsonResponse(value: unknown) {
	return new Response(JSON.stringify(value), { status: 200 })
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.fetchProtocols.mockResolvedValue({ protocols: [] })
})

describe('AdapterMetrics breakdown routes', () => {
	it('normalizes protocol-specific chain filters and uses pooled Dimensions fetches', async () => {
		mocks.fetchWithPoolingOnServer.mockResolvedValue(
			jsonResponse({
				totalDataChartBreakdown: [
					[1, { BSC: { v1: 10 }, Ethereum: { v1: 50 } }],
					[2, { BSC: { v1: 30 }, Ethereum: { v1: 60 } }]
				]
			})
		)
		const { adapterMetricByChainBreakdown } = await import('~/containers/AdapterMetrics/server/breakdownRoutes')

		const result = await adapterMetricByChainBreakdown.handle({
			method: 'GET',
			url: '',
			headers: {},
			query: {
				metric: 'fees',
				protocol: 'aave',
				chains: 'bsc',
				limit: '5'
			}
		})

		expect(result.status).toBe(200)
		expect(result.body).toMatchObject({
			metadata: expect.objectContaining({
				chains: ['BSC']
			})
		})
		expect(mocks.fetchWithPoolingOnServer).toHaveBeenCalledWith(expect.stringContaining('/fees/aave'))
	})

	it('does not mutate the cached protocol category lookup with overview protocol aliases', async () => {
		let overviewCalls = 0
		mocks.fetchWithPoolingOnServer.mockImplementation(async (url: string) => {
			if (/\/fees\/[^/?]+\?/.test(url)) {
				return jsonResponse({
					totalDataChart: [
						[1, 10],
						[2, 20]
					]
				})
			}
			overviewCalls += 1
			return jsonResponse({
				protocols: [
					{
						displayName: 'Transient Protocol',
						category: overviewCalls === 1 ? 'Lending' : undefined,
						breakdown24h: { bsc: { v1: 10 } }
					}
				],
				allChains: ['BSC'],
				totalDataChart: [
					[1, 10],
					[2, 20]
				],
				totalDataChartBreakdown: [
					[1, { 'Transient Protocol': { v1: 10 } }],
					[2, { 'Transient Protocol': { v1: 20 } }]
				]
			})
		})
		const { adapterMetricByChainBreakdown } = await import('~/containers/AdapterMetrics/server/breakdownRoutes')

		const firstResult = await adapterMetricByChainBreakdown.handle({
			method: 'GET',
			url: 'limit-one',
			headers: {},
			query: {
				metric: 'fees',
				protocol: 'All',
				protocolCategories: 'lending',
				limit: '1'
			}
		})
		const secondResult = await adapterMetricByChainBreakdown.handle({
			method: 'GET',
			url: 'limit-two',
			headers: {},
			query: {
				metric: 'fees',
				protocol: 'All',
				protocolCategories: 'lending',
				limit: '2'
			}
		})

		expect(firstResult.body).toMatchObject({ metadata: expect.objectContaining({ totalChains: 1 }) })
		expect(secondResult.body).toMatchObject({ metadata: expect.objectContaining({ totalChains: 0 }) })
	})
})
