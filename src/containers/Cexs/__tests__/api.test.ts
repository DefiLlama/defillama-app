import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	fetchJson: vi.fn(),
	marketsServerUrl: 'https://markets.example.com',
	serverUrl: 'https://api.example.com'
}))

vi.mock('~/constants', () => ({
	get MARKETS_SERVER_URL() {
		return mocks.marketsServerUrl
	},
	get SERVER_URL() {
		return mocks.serverUrl
	}
}))

vi.mock('~/utils/async', () => ({
	fetchJson: mocks.fetchJson
}))

beforeEach(() => {
	mocks.fetchJson.mockReset()
	mocks.fetchJson.mockResolvedValue(null)
})

describe('cex api', () => {
	it('requests the markets exchange list', async () => {
		const api = await import('../api')

		await api.fetchExchangeMarketsListFromNetwork()

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://markets.example.com/exchanges/list.json')
	})

	it('requests an exchange markets index from the upstream markets server', async () => {
		const api = await import('../api')

		await api.fetchExchangeMarketsFromNetwork('Binance')

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://markets.example.com/exchanges/binance/index.json')
	})

	it('requests an exchange markets index through the local proxy', async () => {
		const api = await import('../api')

		await api.fetchExchangeMarkets('Binance')

		expect(mocks.fetchJson).toHaveBeenCalledWith('/api/markets/exchanges/binance')
	})

	it('requests exchange inflows through the batch proxy', async () => {
		const api = await import('../api')
		const authorizedFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Binance: { outflows: 100 } })))

		await expect(
			api.fetchCexInflowsBatchProxy([{ slug: 'Binance', tokensToExclude: 'BNB' }], 1000, 2000, authorizedFetch)
		).resolves.toEqual({ Binance: { outflows: 100 } })

		expect(authorizedFetch).toHaveBeenCalledWith('/api/cex/inflows/batch', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cexs: [{ slug: 'Binance', tokensToExclude: 'BNB' }], start: 1000, end: 2000 })
		})
	})

	it('falls back to per-exchange inflows when the batch proxy is not deployed upstream', async () => {
		const api = await import('../api')
		const authorizedFetch = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'not found' }), { status: 404 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ outflows: 100 })))
			.mockResolvedValueOnce(new Response(JSON.stringify({ outflows: -25 })))

		await expect(
			api.fetchCexInflowsBatchProxy(
				[
					{ slug: 'Binance', tokensToExclude: 'BNB' },
					{ slug: 'OKX', tokensToExclude: '' }
				],
				1000,
				2000,
				authorizedFetch
			)
		).resolves.toEqual({
			Binance: { outflows: 100 },
			OKX: { outflows: -25 }
		})

		expect(authorizedFetch).toHaveBeenNthCalledWith(
			2,
			'/api/cex/inflows?slug=Binance&start=1000&end=2000&tokensToExclude=BNB'
		)
		expect(authorizedFetch).toHaveBeenNthCalledWith(3, '/api/cex/inflows?slug=OKX&start=1000&end=2000&tokensToExclude=')
	})
})
