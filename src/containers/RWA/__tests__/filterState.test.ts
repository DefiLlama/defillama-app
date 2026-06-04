import { describe, expect, it } from 'vitest'
import { hasPerpsOverlayBlockingFiltersFromQuery, parseAttributeFilterStatesParam } from '../filterState'

describe('RWA filter state', () => {
	it('parses attribute filter state params', () => {
		expect(parseAttributeFilterStatesParam(undefined)).toEqual(['yes', 'no', 'unknown'])
		expect(parseAttributeFilterStatesParam('yes')).toEqual(['yes'])
		expect(parseAttributeFilterStatesParam(['yes', 'unknown'])).toEqual(['yes', 'unknown'])
		expect(parseAttributeFilterStatesParam('none')).toEqual([])
		expect(parseAttributeFilterStatesParam('invalid')).toEqual(['yes', 'no', 'unknown'])
	})

	it('treats asset-only query filters as perps overlay blockers', () => {
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ types: 'Asset' }, { mode: 'chain' })).toBe(true)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ minActiveMcapToOnChainMcapPct: '10' }, { mode: 'chain' })).toBe(
			true
		)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ kycForMintRedeemStates: 'yes' }, { mode: 'chain' })).toBe(true)
	})

	it('does not treat shared filters or includeRwaPerps as perps overlay blockers', () => {
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ categories: 'Treasuries' }, { mode: 'chain' })).toBe(false)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ platforms: 'Ondo' }, { mode: 'chain' })).toBe(false)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ includeRwaPerps: 'false' }, { mode: 'chain' })).toBe(false)
	})

	it('treats stablecoin and governance inclusion overrides as perps overlay blockers', () => {
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ includeStablecoins: 'false' }, { mode: 'chain' })).toBe(false)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ includeStablecoins: 'true' }, { mode: 'chain' })).toBe(true)
		expect(
			hasPerpsOverlayBlockingFiltersFromQuery(
				{ includeGovernance: 'false' },
				{ mode: 'category', categorySlug: 'rwa-yield-wrapper' }
			)
		).toBe(true)
	})
})
