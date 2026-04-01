import { describe, expect, it } from 'vitest'
import { parseVenueBreakdownRequest } from '~/pages/api/rwa/perps/venue-breakdown'

describe('parseVenueBreakdownRequest', () => {
	it('accepts valid venue breakdown requests', () => {
		expect(
			parseVenueBreakdownRequest({
				query: {
					venue: 'xyz',
					breakdown: 'referenceAsset',
					key: 'openInterest'
				}
			})
		).toEqual({
			venue: 'xyz',
			breakdown: 'referenceAsset',
			key: 'openInterest'
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
