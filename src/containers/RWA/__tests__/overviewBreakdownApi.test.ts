import { describe, expect, it } from 'vitest'
import { parseOverviewBreakdownRequest } from '~/pages/api/public/rwa/overview-breakdown'

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

	it('rejects arrays and invalid enum values', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: ['platform'],
					key: 'activeMcap',
					includeStablecoin: 'false',
					includeGovernance: 'false'
				}
			})
		).toBeNull()

		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'contract',
					key: 'activeMcap',
					includeStablecoin: 'false',
					includeGovernance: 'false'
				}
			})
		).toBeNull()

		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'platform',
					key: '',
					includeStablecoin: 'false',
					includeGovernance: 'false'
				}
			})
		).toBeNull()
	})
})
