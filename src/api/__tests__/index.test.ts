import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchJsonMock = vi.hoisted(() => vi.fn())
const recordRuntimeErrorMock = vi.hoisted(() => vi.fn())

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock,
	getFastJsonTimeoutMs: () => 1000
}))

vi.mock('~/utils/telemetry', () => ({
	recordRuntimeError: recordRuntimeErrorMock
}))

function priceFor(coin: string) {
	return {
		price: coin.length,
		symbol: coin.toUpperCase(),
		timestamp: 1
	}
}

describe('fetchCoinPrices', () => {
	afterEach(() => {
		fetchJsonMock.mockReset()
		recordRuntimeErrorMock.mockReset()
		vi.resetModules()
	})

	it('uses POST batches of 1000 and preserves merged output order', async () => {
		fetchJsonMock.mockImplementation(async (_url: string, options?: RequestInit) => {
			const body = JSON.parse(String(options?.body))
			return {
				coins: Object.fromEntries(body.coins.map((coin: string) => [coin, priceFor(coin)]))
			}
		})
		const { fetchCoinPrices } = await import('../index')
		const coins = Array.from({ length: 1001 }, (_, i) => `coingecko:token-${i}`)

		const prices = await fetchCoinPrices(coins, { searchWidth: '4h' })

		expect(fetchJsonMock).toHaveBeenCalledTimes(2)
		expect(fetchJsonMock).toHaveBeenNthCalledWith(
			1,
			'https://coins.llama.fi/pro/prices/current',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ coins: coins.slice(0, 1000), searchWidth: '4h' })
			})
		)
		expect(fetchJsonMock).toHaveBeenNthCalledWith(
			2,
			'https://coins.llama.fi/pro/prices/current',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ coins: coins.slice(1000), searchWidth: '4h' })
			})
		)
		expect(Object.keys(prices)).toEqual(coins)
		expect(prices['coingecko:token-1000']).toEqual(priceFor('coingecko:token-1000'))
	})

	it('falls back to legacy GET chunks only for missing POST endpoint errors', async () => {
		fetchJsonMock
			.mockRejectedValueOnce(new Error('https://coins.llama.fi/pro/prices/current: [404] Not Found'))
			.mockImplementation(async (url: string) => {
				const coinList = url.match(/\/current\/([^?]+)/)?.[1]?.split(',') ?? []
				return {
					coins: Object.fromEntries(coinList.map((coin) => [coin, priceFor(coin)]))
				}
			})
		const { fetchCoinPrices } = await import('../index')
		const coins = Array.from({ length: 11 }, (_, i) => `coingecko:fallback-${i}`)

		const prices = await fetchCoinPrices(coins)

		expect(fetchJsonMock).toHaveBeenCalledTimes(3)
		expect(String(fetchJsonMock.mock.calls[1][0])).toContain('/prices/current/')
		expect(String(fetchJsonMock.mock.calls[2][0])).toContain('/prices/current/')
		expect(Object.keys(prices)).toEqual(coins)
	})

	it('does not fall back to legacy GET for server failures', async () => {
		fetchJsonMock.mockRejectedValue(new Error('https://coins.llama.fi/pro/prices/current: [500] Internal Error'))
		const { fetchCoinPrices } = await import('../index')

		await expect(fetchCoinPrices(['coingecko:ethereum'])).resolves.toEqual({})

		expect(fetchJsonMock).toHaveBeenCalledTimes(1)
		expect(recordRuntimeErrorMock).toHaveBeenCalled()
	})
})
