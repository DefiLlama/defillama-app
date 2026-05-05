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
		const api = await import('./api')

		await api.fetchExchangeMarketsListFromNetwork()

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://markets.example.com/exchanges/list.json')
	})

	it('requests an exchange markets index from the upstream markets server', async () => {
		const api = await import('./api')

		await api.fetchExchangeMarketsFromNetwork('Binance')

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://markets.example.com/exchanges/binance/index.json')
	})

	it('requests an exchange markets index through the local proxy', async () => {
		const api = await import('./api')

		await api.fetchExchangeMarkets('Binance')

		expect(mocks.fetchJson).toHaveBeenCalledWith('/api/markets/exchanges/binance')
	})
})
