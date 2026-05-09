import { describe, expect, it } from 'vitest'
import { parseOverviewBreakdownRequest } from '~/pages/api/rwa/perps/overview-breakdown'

describe('parseOverviewBreakdownRequest', () => {
	it('accepts overview requests without a target', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'assetGroup',
					key: 'openInterest'
				}
			})
		).toEqual({
			breakdown: 'assetGroup',
			key: 'openInterest'
		})
	})

	it('accepts venue-targeted requests', () => {
		expect(
			parseOverviewBreakdownRequest({
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

	it('accepts asset-group-targeted requests', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					assetGroup: 'US Equities',
					breakdown: 'venue',
					key: 'markets'
				}
			})
		).toEqual({
			assetGroup: 'US Equities',
			breakdown: 'venue',
			key: 'markets'
		})
	})

	it('rejects contract breakdowns and invalid target combinations', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'contract',
					key: 'markets'
				}
			})
		).toBeNull()

		expect(
			parseOverviewBreakdownRequest({
				query: {
					venue: 'xyz',
					assetGroup: 'US Equities',
					breakdown: 'baseAsset',
					key: 'openInterest'
				}
			})
		).toBeNull()

		expect(
			parseOverviewBreakdownRequest({
				query: {
					venue: '   ',
					breakdown: 'baseAsset',
					key: 'openInterest'
				}
			})
		).toBeNull()
	})
})
