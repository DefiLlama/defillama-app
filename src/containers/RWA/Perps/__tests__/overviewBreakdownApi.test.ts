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

	it('accepts asset-class-targeted requests', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					assetClass: 'Forex Perps',
					breakdown: 'assetGroup',
					key: 'openInterest'
				}
			})
		).toEqual({
			assetClass: 'Forex Perps',
			breakdown: 'assetGroup',
			key: 'openInterest'
		})
	})

	it('accepts asset-class exclusion requests', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					excludeAssetClass: 'Forex Perps',
					breakdown: 'assetGroup',
					key: 'openInterest'
				}
			})
		).toEqual({
			excludeAssetClass: 'Forex Perps',
			breakdown: 'assetGroup',
			key: 'openInterest'
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
					assetGroup: 'US Equities',
					assetClass: 'Forex Perps',
					breakdown: 'baseAsset',
					key: 'openInterest'
				}
			})
		).toBeNull()

		expect(
			parseOverviewBreakdownRequest({
				query: {
					assetClass: 'Forex Perps',
					excludeAssetClass: 'Forex Perps',
					breakdown: 'baseAsset',
					key: 'openInterest'
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
