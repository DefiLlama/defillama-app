import { describe, expect, it } from 'vitest'
import { getOverviewBreakdownRequestState } from './OverviewBreakdownChart'

describe('getOverviewBreakdownRequestState', () => {
	it('uses the platform default state when there are no query params', () => {
		expect(getOverviewBreakdownRequestState({ kind: 'platform' }, 'activeMcap', {})).toEqual({
			request: {
				breakdown: 'platform',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			},
			isDefaultState: true
		})
	})

	it('reads both inclusion flags for platforms', () => {
		expect(
			getOverviewBreakdownRequestState({ kind: 'platform' }, 'activeMcap', {
				includeStablecoins: 'true',
				includeGovernance: 'true'
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

	it('uses the same default state for categories and asset groups', () => {
		expect(getOverviewBreakdownRequestState({ kind: 'category' }, 'activeMcap', {})).toEqual({
			request: {
				breakdown: 'category',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			},
			isDefaultState: true
		})

		expect(getOverviewBreakdownRequestState({ kind: 'assetGroup' }, 'activeMcap', {})).toEqual({
			request: {
				breakdown: 'assetGroup',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			},
			isDefaultState: true
		})
	})
})
