import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchJson = vi.fn()

vi.mock('~/constants', () => ({
	RWA_PERPS_SERVER_URL: 'https://example.com/rwa-perps'
}))

vi.mock('~/utils/async', () => ({
	fetchJson
}))

beforeEach(() => {
	fetchJson.mockReset()
	fetchJson.mockResolvedValue(null)
})

afterEach(() => {
	vi.clearAllMocks()
})

describe('rwa perps api urls', () => {
	it('encodes contract, venue, and market ids in request paths', async () => {
		const api = await import('./api')

		await api.fetchRWAPerpsMarketById('xyz:META/2026')
		await api.fetchRWAPerpsMarketsByContract('xyz:META/2026')
		await api.fetchRWAPerpsMarketsByVenue('my venue')
		await api.fetchRWAPerpsVenueChart('venue/one')

		expect(fetchJson.mock.calls).toEqual([
			['https://example.com/rwa-perps/market/xyz%3AMETA%2F2026'],
			['https://example.com/rwa-perps/coin/xyz%3AMETA%2F2026'],
			['https://example.com/rwa-perps/venue/my%20venue'],
			['https://example.com/rwa-perps/chart/venue/venue%2Fone']
		])
	})

	it('builds funding history urls with optional query params', async () => {
		const api = await import('./api')

		await api.fetchRWAPerpsFundingHistory('xyz:META', { startTime: 10, endTime: 20 })
		await api.fetchRWAPerpsFundingHistory('xyz:META')

		expect(fetchJson.mock.calls).toEqual([
			['https://example.com/rwa-perps/funding/xyz%3AMETA?startTime=10&endTime=20'],
			['https://example.com/rwa-perps/funding/xyz%3AMETA']
		])
	})
})
