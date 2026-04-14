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

	it('accepts venue and asset-group targets', () => {
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
