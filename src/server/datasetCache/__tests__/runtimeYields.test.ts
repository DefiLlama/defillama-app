import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchJsonMock, mapPoolToYieldTableRowMock } = vi.hoisted(() => ({
	fetchJsonMock: vi.fn(),
	mapPoolToYieldTableRowMock: vi.fn()
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('~/containers/Token/tokenBorrowRoutes.server', () => ({
	getTokenBorrowRoutesDataFromNetwork: vi.fn()
}))

vi.mock('~/containers/Token/tokenYields.server', () => ({
	getTokenYieldsRowsFromNetwork: vi.fn()
}))

vi.mock('~/containers/Yields/poolsPipeline', () => ({
	buildYieldTableRowsWithBorrowData: vi.fn(() => []),
	mapPoolToYieldTableRow: mapPoolToYieldTableRowMock
}))

vi.mock('~/containers/Yields/queries/index', () => ({
	fetchYieldConfigFromNetwork: vi.fn(),
	getLendBorrowData: vi.fn(),
	getYieldPageData: vi.fn()
}))

describe('dataset cache yields runtime adapter', () => {
	beforeEach(() => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('DATASET_CACHE_DISABLE', '1')
		fetchJsonMock.mockReset()
		mapPoolToYieldTableRowMock.mockReset()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.resetModules()
	})

	it('accepts standard 8-4-4-4-12 yield pool UUIDs on the network path', async () => {
		const poolId = '79e042b5-e55d-4a4e-b0b0-6661a570470b'
		fetchJsonMock.mockResolvedValueOnce({ data: [{ project: 'aave' }] })
		fetchJsonMock.mockResolvedValueOnce({ protocols: { aave: { name: 'Aave' } } })
		mapPoolToYieldTableRowMock.mockReturnValue({
			pool: 'USDC',
			projectslug: 'aave',
			chains: ['Ethereum']
		})
		const { getYieldPoolPageData } = await import('../runtime/yields')

		const result = await getYieldPoolPageData(poolId)

		expect(fetchJsonMock.mock.calls[0][0]).toContain(encodeURIComponent(poolId))
		expect(result.data?.poolId).toBe(poolId)
	})
})
