import { describe, expect, it } from 'vitest'
import { getDefaultRWAOverviewInclusion } from './constants'

describe('getDefaultRWAOverviewInclusion', () => {
	it('enables stablecoins and governance by default for rwa-yield-wrapper category pages', () => {
		expect(getDefaultRWAOverviewInclusion({ mode: 'category', categorySlug: 'rwa-yield-wrapper' })).toEqual({
			includeStablecoins: true,
			includeGovernance: true
		})
	})

	it('enables stablecoins by default for APYX platform pages', () => {
		expect(getDefaultRWAOverviewInclusion({ mode: 'platform', platformSlug: 'apyx' })).toEqual({
			includeStablecoins: true,
			includeGovernance: false
		})
	})

	it('keeps other RWA pages on the existing false defaults', () => {
		expect(getDefaultRWAOverviewInclusion({ mode: 'category', categorySlug: 'private-credit' })).toEqual({
			includeStablecoins: false,
			includeGovernance: false
		})
		expect(getDefaultRWAOverviewInclusion({ mode: 'platform', platformSlug: 'other-platform' })).toEqual({
			includeStablecoins: false,
			includeGovernance: false
		})
		expect(getDefaultRWAOverviewInclusion({ mode: 'chain' })).toEqual({
			includeStablecoins: false,
			includeGovernance: false
		})
	})
})
