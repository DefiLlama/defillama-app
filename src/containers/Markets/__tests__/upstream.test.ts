import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	fetchJson: vi.fn(),
	marketsServerUrl: 'https://markets.example.com'
}))

vi.mock('~/constants', () => ({
	get MARKETS_SERVER_URL() {
		return mocks.marketsServerUrl
	}
}))

vi.mock('~/utils/async', () => ({
	fetchJson: mocks.fetchJson
}))

beforeEach(() => {
	mocks.fetchJson.mockReset()
	mocks.fetchJson.mockResolvedValue(null)
})

describe('markets upstream api', () => {
	it('requests the token markets list', async () => {
		const upstream = await import('../server/upstream')

		await upstream.fetchTokenMarketsListFromNetwork()

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://markets.example.com/tokens/list.json')
	})

	it('requests the exchange markets list', async () => {
		const upstream = await import('../server/upstream')

		await upstream.fetchExchangeMarketsListFromNetwork()

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://markets.example.com/exchanges/list.json')
	})

	it('requests an exchange markets index from the upstream markets server', async () => {
		const upstream = await import('../server/upstream')

		await upstream.fetchExchangeMarketsFromNetwork('Binance')

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://markets.example.com/exchanges/binance/index.json')
	})
})
