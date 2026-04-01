import { describe, expect, it } from 'vitest'
import { getDefaultRWAOverviewInclusion } from './constants'

describe('getDefaultRWAOverviewInclusion', () => {
	it('enables stablecoins and governance by default for rwa-yield-wrapper category pages', () => {
		expect(getDefaultRWAOverviewInclusion('category', 'rwa-yield-wrapper')).toEqual({
			includeStablecoins: true,
			includeGovernance: true
		})
	})

	it('keeps other RWA pages on the existing false defaults', () => {
		expect(getDefaultRWAOverviewInclusion('category', 'private-credit')).toEqual({
			includeStablecoins: false,
			includeGovernance: false
		})
		expect(getDefaultRWAOverviewInclusion('chain', null)).toEqual({
			includeStablecoins: false,
			includeGovernance: false
		})
	})
})
