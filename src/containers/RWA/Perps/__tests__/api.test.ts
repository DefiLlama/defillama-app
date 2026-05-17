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
		const api = await import('../api')

		await api.fetchRWAPerpsMarketById('xyz:META/2026')
		await api.fetchRWAPerpsMarketsByContract('xyz:META/2026')
		await api.fetchRWAPerpsMarketsByVenue('my venue')
		await api.fetchRWAPerpsMarketsByAssetGroup('US Equities')
		await api.fetchRWAPerpsVenueChart('venue/one')
		await api.fetchRWAPerpsOverviewBreakdownChartData({
			breakdown: 'assetGroup',
			key: 'openInterest',
			venue: 'xyz'
		})
		await api.fetchRWAPerpsContractBreakdownChartData({
			key: 'markets',
			assetGroup: 'US Equities'
		})

		expect(fetchJson.mock.calls).toEqual([
			['https://example.com/rwa-perps/market/xyz%3AMETA%2F2026?zz=15'],
			['https://example.com/rwa-perps/contract/xyz%3AMETA%2F2026?zz=15'],
			['https://example.com/rwa-perps/venue/my%20venue?zz=15'],
			['https://example.com/rwa-perps/assetGroup/US%20Equities?zz=15'],
			['https://example.com/rwa-perps/chart/venue/venue%2Fone?zz=15'],
			['https://example.com/rwa-perps/chart/overview-breakdown?breakdown=assetGroup&key=openInterest&venue=xyz'],
			['https://example.com/rwa-perps/chart/contract-breakdown?key=markets&assetGroup=US+Equities']
		])
	})

	it('builds funding history urls with optional query params', async () => {
		const api = await import('../api')

		await api.fetchRWAPerpsFundingHistory('xyz:META', { startTime: 10, endTime: 20 })
		await api.fetchRWAPerpsFundingHistory('xyz:META')

		expect(fetchJson.mock.calls).toEqual([
			['https://example.com/rwa-perps/funding/xyz%3AMETA?startTime=10&endTime=20&zz=15'],
			['https://example.com/rwa-perps/funding/xyz%3AMETA?zz=15']
		])
	})
})
