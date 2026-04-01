import { describe, expect, it } from 'vitest'
import { parseOverviewBreakdownRequest } from '~/pages/api/rwa/perps/overview-breakdown'

describe('parseOverviewBreakdownRequest', () => {
	it('accepts venue requests', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'venue',
					key: 'volume24h'
				}
			})
		).toEqual({
			breakdown: 'venue',
			key: 'volume24h'
		})
	})

	it('accepts regrouped overview requests', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'assetClass',
					key: 'openInterest'
				}
			})
		).toEqual({
			breakdown: 'assetClass',
			key: 'openInterest'
		})

		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'baseAsset',
					key: 'markets'
				}
			})
		).toEqual({
			breakdown: 'baseAsset',
			key: 'markets'
		})

		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'coin',
					key: 'markets'
				}
			})
		).toEqual({
			breakdown: 'coin',
			key: 'markets'
		})
	})

	it('accepts markets requests', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'venue',
					key: 'markets'
				}
			})
		).toEqual({
			breakdown: 'venue',
			key: 'markets'
		})
	})

	it('rejects invalid query params', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'asset',
					key: 'openInterest'
				}
			})
		).toBeNull()

		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'venue',
					key: 'activeMcap'
				}
			})
		).toBeNull()
	})
})
