import { describe, expect, it } from 'vitest'
import {
	UNKNOWN_BREAKDOWN_LABEL,
	getRWAPerpsContractBreakdownLabel,
	getRWAPerpsOverviewBreakdownLabel,
	getRWAPerpsOverviewSnapshotBreakdownLabel,
	getRWAPerpsBaseAssetBreakdownLabel,
	getRWAPerpsSharedBreakdownLabel,
	getRWAPerpsVenueBreakdownLabel,
	normalizeRWAPerpsBreakdownLabel
} from './breakdownLabels'

const baseRow = {
	contract: 'xyz:META',
	venue: 'xyz',
	referenceAsset: 'Meta',
	assetClass: ['Single stock synthetic perp']
}

describe('breakdownLabels', () => {
	it('normalizes empty labels to the shared unknown bucket', () => {
		expect(normalizeRWAPerpsBreakdownLabel('')).toBe(UNKNOWN_BREAKDOWN_LABEL)
		expect(normalizeRWAPerpsBreakdownLabel(null)).toBe(UNKNOWN_BREAKDOWN_LABEL)
		expect(normalizeRWAPerpsBreakdownLabel(undefined)).toBe(UNKNOWN_BREAKDOWN_LABEL)
	})

	it('falls back to the coin suffix when reference asset is missing', () => {
		expect(getRWAPerpsBaseAssetBreakdownLabel({ contract: 'xyz:META', referenceAsset: null })).toBe('META')
	})

	it('falls back to unknown when the coin label is also missing', () => {
		expect(getRWAPerpsContractBreakdownLabel({ contract: '' })).toBe(UNKNOWN_BREAKDOWN_LABEL)
	})

	it('resolves overview, venue, and shared labels consistently', () => {
		expect(getRWAPerpsSharedBreakdownLabel(baseRow, 'venue')).toBe('xyz')
		expect(getRWAPerpsOverviewBreakdownLabel(baseRow, 'baseAsset')).toBe('Meta')
		expect(getRWAPerpsVenueBreakdownLabel(baseRow, 'assetClass')).toBe('Single stock synthetic perp')
		expect(getRWAPerpsOverviewSnapshotBreakdownLabel({ ...baseRow, category: [], id: 'x' } as any, 'contract')).toBe(
			'xyz:META'
		)
	})
})
