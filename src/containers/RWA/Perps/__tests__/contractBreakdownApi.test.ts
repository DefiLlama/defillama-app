import { describe, expect, it } from 'vitest'
import { parseContractBreakdownRequest } from '~/pages/api/rwa/perps/contract-breakdown'

describe('parseContractBreakdownRequest', () => {
	it('accepts overview contract requests', () => {
		expect(
			parseContractBreakdownRequest({
				query: {
					key: 'markets'
				}
			})
		).toEqual({
			key: 'markets'
		})
	})

	it('accepts venue, asset-group, asset-class, and asset-class exclusion targets', () => {
		expect(
			parseContractBreakdownRequest({
				query: {
					venue: ' xyz ',
					key: 'openInterest'
				}
			})
		).toEqual({
			venue: 'xyz',
			key: 'openInterest'
		})

		expect(
			parseContractBreakdownRequest({
				query: {
					assetGroup: 'US Equities',
					key: 'volume24h'
				}
			})
		).toEqual({
			assetGroup: 'US Equities',
			key: 'volume24h'
		})

		expect(
			parseContractBreakdownRequest({
				query: {
					assetClass: 'Forex Perps',
					key: 'markets'
				}
			})
		).toEqual({
			assetClass: 'Forex Perps',
			key: 'markets'
		})

		expect(
			parseContractBreakdownRequest({
				query: {
					excludeAssetClass: 'Forex Perps',
					key: 'markets'
				}
			})
		).toEqual({
			excludeAssetClass: 'Forex Perps',
			key: 'markets'
		})
	})

	it('rejects invalid query params', () => {
		expect(
			parseContractBreakdownRequest({
				query: {
					venue: ['xyz'],
					key: 'openInterest'
				}
			})
		).toBeNull()

		expect(
			parseContractBreakdownRequest({
				query: {
					assetClass: 'Forex Perps',
					excludeAssetClass: 'Forex Perps',
					key: 'markets'
				}
			})
		).toBeNull()

		expect(
			parseContractBreakdownRequest({
				query: {
					venue: 'xyz',
					assetClass: 'Forex Perps',
					key: 'markets'
				}
			})
		).toBeNull()

		expect(
			parseContractBreakdownRequest({
				query: {
					venue: 'xyz',
					assetGroup: 'US Equities',
					key: 'markets'
				}
			})
		).toBeNull()

		expect(
			parseContractBreakdownRequest({
				query: {
					key: 'activeMcap'
				}
			})
		).toBeNull()
	})
})
