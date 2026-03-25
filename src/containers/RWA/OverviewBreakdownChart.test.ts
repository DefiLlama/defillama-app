import { describe, expect, it } from 'vitest'
import { getOverviewBreakdownRequestState } from './OverviewBreakdownChart'

describe('getOverviewBreakdownRequestState', () => {
	it('uses the platform default state when there are no query params', () => {
		expect(getOverviewBreakdownRequestState({ kind: 'platform' }, 'activeMcap', {})).toEqual({
			request: {
				breakdown: 'platform',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: true
			},
			isDefaultState: true
		})
	})

	it('reads includeStablecoins for platforms and ignores includeGovernance from the URL', () => {
		expect(
			getOverviewBreakdownRequestState({ kind: 'platform' }, 'activeMcap', {
				includeStablecoins: 'true',
				includeGovernance: 'false'
			})
		).toEqual({
			request: {
				breakdown: 'platform',
				key: 'activeMcap',
				includeStablecoin: true,
				includeGovernance: true
			},
			isDefaultState: false
		})
	})
})
