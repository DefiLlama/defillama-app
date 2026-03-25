import { describe, expect, it } from 'vitest'
import { parseOverviewBreakdownRequest } from '~/pages/api/rwa/overview-breakdown'

describe('parseOverviewBreakdownRequest', () => {
	it('accepts platform requests when both flags are false', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'platform',
					key: 'activeMcap',
					includeStablecoin: 'false',
					includeGovernance: 'false'
				}
			})
		).toEqual({
			breakdown: 'platform',
			key: 'activeMcap',
			includeStablecoin: false,
			includeGovernance: false
		})
	})

	it('accepts platform requests when both flags are true', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'platform',
					key: 'activeMcap',
					includeStablecoin: 'true',
					includeGovernance: 'true'
				}
			})
		).toEqual({
			breakdown: 'platform',
			key: 'activeMcap',
			includeStablecoin: true,
			includeGovernance: true
		})
	})

	it('accepts category and asset group requests with mixed inclusion flags', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'category',
					key: 'activeMcap',
					includeStablecoin: 'true',
					includeGovernance: 'false'
				}
			})
		).toEqual({
			breakdown: 'category',
			key: 'activeMcap',
			includeStablecoin: true,
			includeGovernance: false
		})

		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'assetGroup',
					key: 'activeMcap',
					includeStablecoin: 'false',
					includeGovernance: 'true'
				}
			})
		).toEqual({
			breakdown: 'assetGroup',
			key: 'activeMcap',
			includeStablecoin: false,
			includeGovernance: true
		})
	})
})
