import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchJsonMock = vi.hoisted(() => vi.fn())
const recordRuntimeErrorMock = vi.hoisted(() => vi.fn())

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('~/utils/telemetry', () => ({
	recordRuntimeError: recordRuntimeErrorMock
}))

function priceFor(coin: string) {
	return {
		confidence: 0.99,
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
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it('uses legacy GET chunks without a server API key', async () => {
		fetchJsonMock.mockImplementation(async (url: string) => {
			const coinList = url.match(/\/current\/([^?]+)/)?.[1]?.split(',') ?? []
			return {
				coins: Object.fromEntries(coinList.map((coin) => [coin, priceFor(coin)]))
			}
		})
		const { fetchCoinPrices } = await import('../pricing')
		const coins = Array.from({ length: 11 }, (_, i) => `coingecko:get-${i}`)

		const prices = await fetchCoinPrices(coins, { searchWidth: '4h' })

		expect(fetchJsonMock).toHaveBeenCalledTimes(2)
		expect(fetchJsonMock).toHaveBeenNthCalledWith(
			1,
			`https://coins.llama.fi/prices/current/${coins.slice(0, 10).join(',')}?searchWidth=4h`
		)
		expect(fetchJsonMock).toHaveBeenNthCalledWith(
			2,
			`https://coins.llama.fi/prices/current/${coins.slice(10).join(',')}?searchWidth=4h`
		)
		expect(Object.keys(prices)).toEqual(coins)
	})

	it('uses legacy GET chunks in browser runtime even when an API key is present', async () => {
		vi.stubEnv('API_KEY', 'pro-secret')
		vi.stubGlobal('window', {})
		fetchJsonMock.mockImplementation(async (url: string) => {
			const coinList = url.match(/\/current\/([^?]+)/)?.[1]?.split(',') ?? []
			return {
				coins: Object.fromEntries(coinList.map((coin) => [coin, priceFor(coin)]))
			}
		})
		const { fetchCoinPrices } = await import('../pricing')
		const coins = ['coingecko:browser-0']

		const prices = await fetchCoinPrices(coins)

		expect(fetchJsonMock).toHaveBeenCalledTimes(1)
		expect(fetchJsonMock).toHaveBeenCalledWith('https://coins.llama.fi/prices/current/coingecko:browser-0')
		expect(Object.keys(prices)).toEqual(coins)
	})

	it('uses server POST batches of 100000 when an API key is available', async () => {
		vi.stubEnv('API_KEY', 'pro-secret')
		fetchJsonMock.mockImplementation(async (_url: string, options?: RequestInit) => {
			const body = JSON.parse(String(options?.body))
			return {
				coins: Object.fromEntries(body.coins.map((coin: string) => [coin, priceFor(coin)]))
			}
		})
		const { fetchCoinPrices } = await import('../pricing')
		const coins = Array.from({ length: 100001 }, (_, i) => `coingecko:token-${i}`)

		const prices = await fetchCoinPrices(coins, { searchWidth: '4h' })

		expect(fetchJsonMock).toHaveBeenCalledTimes(2)
		expect(fetchJsonMock).toHaveBeenNthCalledWith(
			1,
			'https://pro-api.llama.fi/pro-secret/coins/pro/prices/current',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ coins: coins.slice(0, 100000), searchWidth: '4h' })
			})
		)
		expect(fetchJsonMock).toHaveBeenNthCalledWith(
			2,
			'https://pro-api.llama.fi/pro-secret/coins/pro/prices/current',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ coins: coins.slice(100000), searchWidth: '4h' })
			})
		)
		expect(Object.keys(prices)).toEqual(coins)
		expect(prices['coingecko:token-100000']).toEqual(priceFor('coingecko:token-100000'))
	})

	it('falls back to legacy GET chunks only for missing POST endpoint errors', async () => {
		vi.stubEnv('API_KEY', 'pro-secret')
		fetchJsonMock
			.mockRejectedValueOnce(new Error('https://pro-api.llama.fi/pro-secret/coins/pro/prices/current: [404] Not Found'))
			.mockImplementation(async (url: string) => {
				const coinList = url.match(/\/current\/([^?]+)/)?.[1]?.split(',') ?? []
				return {
					coins: Object.fromEntries(coinList.map((coin) => [coin, priceFor(coin)]))
				}
			})
		const { fetchCoinPrices } = await import('../pricing')
		const coins = Array.from({ length: 11 }, (_, i) => `coingecko:fallback-${i}`)

		const prices = await fetchCoinPrices(coins)

		expect(fetchJsonMock).toHaveBeenCalledTimes(3)
		expect(String(fetchJsonMock.mock.calls[1][0])).toContain('/prices/current/')
		expect(String(fetchJsonMock.mock.calls[2][0])).toContain('/prices/current/')
		expect(Object.keys(prices)).toEqual(coins)
	})

	it('keeps legacy GET fallback partial results when one chunk fails', async () => {
		vi.stubEnv('API_KEY', 'pro-secret')
		fetchJsonMock
			.mockRejectedValueOnce(new Error('https://pro-api.llama.fi/pro-secret/coins/pro/prices/current: [404] Not Found'))
			.mockImplementation(async (url: string) => {
				const coinList = url.match(/\/current\/([^?]+)/)?.[1]?.split(',') ?? []
				if (coinList.includes('coingecko:fallback-0')) {
					throw new Error('legacy chunk failed')
				}
				return {
					coins: Object.fromEntries(coinList.map((coin) => [coin, priceFor(coin)]))
				}
			})
		const { fetchCoinPrices } = await import('../pricing')
		const coins = Array.from({ length: 11 }, (_, i) => `coingecko:fallback-${i}`)

		const prices = await fetchCoinPrices(coins)

		expect(fetchJsonMock).toHaveBeenCalledTimes(3)
		expect(Object.keys(prices)).toEqual(['coingecko:fallback-10'])
		expect(recordRuntimeErrorMock).toHaveBeenCalledWith(
			expect.any(Error),
			'outboundFetch',
			expect.objectContaining({
				target: 'https://pro-api.llama.fi/pro-secret/coins/prices/current',
				coin_count: 10,
				first_coin: 'coingecko:fallback-0'
			})
		)
	})

	it('does not fall back to legacy GET for server failures', async () => {
		vi.stubEnv('API_KEY', 'pro-secret')
		fetchJsonMock.mockRejectedValue(
			new Error('https://pro-api.llama.fi/pro-secret/coins/pro/prices/current: [500] Internal Error')
		)
		const { fetchCoinPrices } = await import('../pricing')

		await expect(fetchCoinPrices(['coingecko:ethereum'])).resolves.toEqual({})

		expect(fetchJsonMock).toHaveBeenCalledTimes(1)
		expect(recordRuntimeErrorMock).toHaveBeenCalled()
	})
})

describe('fetchCoinPriceByCoinGeckoIdViaLlamaPrices', () => {
	afterEach(() => {
		fetchJsonMock.mockReset()
		recordRuntimeErrorMock.mockReset()
		vi.resetModules()
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it('maps CoinGecko ids to DefiLlama coingecko coin keys', async () => {
		fetchJsonMock.mockResolvedValue({
			coins: {
				'coingecko:bitcoin': priceFor('coingecko:bitcoin')
			}
		})
		const { fetchCoinPriceByCoinGeckoIdViaLlamaPrices } = await import('../pricing')

		const price = await fetchCoinPriceByCoinGeckoIdViaLlamaPrices('bitcoin')

		expect(fetchJsonMock).toHaveBeenCalledWith('https://coins.llama.fi/prices/current/coingecko:bitcoin')
		expect(price).toEqual(priceFor('coingecko:bitcoin'))
	})
})
