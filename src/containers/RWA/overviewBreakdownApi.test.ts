import { describe, expect, it } from 'vitest'
import { parseOverviewBreakdownRequest } from '~/pages/api/rwa/overview-breakdown'

describe('parseOverviewBreakdownRequest', () => {
	it('accepts platform requests with includeStablecoin false when governance is true', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'platform',
					key: 'activeMcap',
					includeStablecoin: 'false',
					includeGovernance: 'true'
				}
			})
		).toEqual({
			breakdown: 'platform',
			key: 'activeMcap',
			includeStablecoin: false,
			includeGovernance: true
		})
	})

	it('accepts platform requests with includeStablecoin true when governance is true', () => {
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

	it('rejects platform requests when governance is false', () => {
		expect(
			parseOverviewBreakdownRequest({
				query: {
					breakdown: 'platform',
					key: 'activeMcap',
					includeStablecoin: 'true',
					includeGovernance: 'false'
				}
			})
		).toBeNull()
	})
})
