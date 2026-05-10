import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	YIELD_CHAIN_API,
	YIELD_CONFIG_API,
	YIELD_LEND_BORROW_API,
	YIELD_POOLS_API,
	YIELD_TOKEN_CATEGORIES_API,
	YIELD_URL_API
} from '~/constants'

const {
	fetchJsonMock,
	fetchCoinPricesMock,
	fetchProtocolsMock,
	fetchRaisesFromNetworkMock,
	fetchStablecoinAssetsApiMock
} = vi.hoisted(() => ({
	fetchJsonMock: vi.fn(),
	fetchCoinPricesMock: vi.fn(),
	fetchProtocolsMock: vi.fn(),
	fetchRaisesFromNetworkMock: vi.fn(),
	fetchStablecoinAssetsApiMock: vi.fn()
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('~/api', () => ({
	fetchCoinPrices: fetchCoinPricesMock
}))

vi.mock('~/containers/Protocols/api', () => ({
	fetchProtocols: fetchProtocolsMock
}))

vi.mock('~/containers/Raises/api', () => ({
	fetchRaisesFromNetwork: fetchRaisesFromNetworkMock
}))

vi.mock('~/containers/Stablecoins/api', () => ({
	fetchStablecoinAssetsApi: fetchStablecoinAssetsApiMock
}))

function mockYieldApiResponses() {
	fetchJsonMock.mockImplementation((url: string) => {
		if (url === YIELD_POOLS_API) return Promise.resolve({ data: [] })
		if (url === YIELD_CONFIG_API) return Promise.resolve({ protocols: {} })
		if (url === YIELD_URL_API) return Promise.resolve({})
		if (url === YIELD_CHAIN_API) return Promise.resolve([])
		if (url === YIELD_LEND_BORROW_API) return Promise.resolve([])
		if (url === YIELD_TOKEN_CATEGORIES_API) return Promise.resolve({})
		return Promise.resolve({})
	})
	fetchProtocolsMock.mockResolvedValue({ protocols: [], parentProtocols: [] })
	fetchRaisesFromNetworkMock.mockResolvedValue({ raises: [] })
	fetchCoinPricesMock.mockResolvedValue({})
	fetchStablecoinAssetsApiMock.mockResolvedValue({ peggedAssets: [] })
}

describe('yield network queries', () => {
	beforeEach(() => {
		fetchJsonMock.mockReset()
		fetchCoinPricesMock.mockReset()
		fetchProtocolsMock.mockReset()
		fetchRaisesFromNetworkMock.mockReset()
		fetchStablecoinAssetsApiMock.mockReset()
		mockYieldApiResponses()
	})

	it('passes explicit long timeouts to the yield page source APIs', async () => {
		const { getYieldPageDataFromNetwork } = await import('../index')

		await getYieldPageDataFromNetwork({ timeout: 180_000 })

		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_POOLS_API, { timeout: 180_000 })
		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_CONFIG_API, { timeout: 180_000 })
		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_URL_API, { timeout: 180_000 })
		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_CHAIN_API, { timeout: 180_000 })
		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_TOKEN_CATEGORIES_API, { timeout: 180_000 })
	})

	it('passes explicit long timeouts to the yield config API', async () => {
		const { fetchYieldConfigFromNetwork } = await import('../index')

		await fetchYieldConfigFromNetwork({ timeout: 180_000 })

		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_CONFIG_API, { timeout: 180_000 })
	})

	it('passes explicit long timeouts to the lend-borrow API', async () => {
		const { getLendBorrowDataFromYieldPageData, getYieldPageDataFromNetwork } = await import('../index')
		const yieldPageData = await getYieldPageDataFromNetwork({ timeout: 180_000 })
		fetchJsonMock.mockClear()
		mockYieldApiResponses()

		await getLendBorrowDataFromYieldPageData(yieldPageData, { timeout: 180_000 })

		expect(fetchJsonMock).toHaveBeenCalledWith(YIELD_LEND_BORROW_API, { timeout: 180_000 })
	})
})
