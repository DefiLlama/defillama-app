import { describe, expect, it } from 'vitest'
import { parseVenueBreakdownRequest } from '~/pages/api/rwa/perps/venue-breakdown'

describe('parseVenueBreakdownRequest', () => {
	it('accepts valid venue breakdown requests', () => {
		expect(
			parseVenueBreakdownRequest({
				query: {
					venue: 'xyz',
					breakdown: 'baseAsset',
					key: 'openInterest'
				}
			})
		).toEqual({
			venue: 'xyz',
			breakdown: 'baseAsset',
			key: 'openInterest'
		})
	})

	it('trims venue values before returning the request', () => {
		expect(
			parseVenueBreakdownRequest({
				query: {
					venue: ' xyz ',
					breakdown: 'baseAsset',
					key: 'volume24h'
				}
			})
		).toEqual({
			venue: 'xyz',
			breakdown: 'baseAsset',
			key: 'volume24h'
		})
	})

	it('accepts markets requests', () => {
		expect(
			parseVenueBreakdownRequest({
				query: {
					venue: 'xyz',
					breakdown: 'coin',
					key: 'markets'
				}
			})
		).toEqual({
			venue: 'xyz',
			breakdown: 'coin',
			key: 'markets'
		})
	})

	it('rejects invalid query params', () => {
		expect(
			parseVenueBreakdownRequest({
				query: {
					venue: ['xyz'],
					breakdown: 'coin',
					key: 'openInterest'
				}
			})
		).toBeNull()

		expect(
			parseVenueBreakdownRequest({
				query: {
					venue: '   ',
					breakdown: 'coin',
					key: 'markets'
				}
			})
		).toBeNull()

		expect(
			parseVenueBreakdownRequest({
				query: {
					venue: 'xyz',
					breakdown: 'venue',
					key: 'openInterest'
				}
			})
		).toBeNull()

		expect(
			parseVenueBreakdownRequest({
				query: {
					venue: 'xyz',
					breakdown: 'issuer',
					key: 'activeMcap'
				}
			})
		).toBeNull()
	})
})
