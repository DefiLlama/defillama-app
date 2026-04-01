import { describe, expect, it } from 'vitest'
import {
	UNKNOWN_BREAKDOWN_LABEL,
	getRWAPerpsCoinBreakdownLabel,
	getRWAPerpsOverviewBreakdownLabel,
	getRWAPerpsOverviewSnapshotBreakdownLabel,
	getRWAPerpsBaseAssetBreakdownLabel,
	getRWAPerpsSharedBreakdownLabel,
	getRWAPerpsVenueBreakdownLabel,
	normalizeRWAPerpsBreakdownLabel
} from './breakdownLabels'

const baseRow = {
	coin: 'xyz:META',
	venue: 'xyz',
	referenceAsset: 'Meta',
	assetClass: 'Single stock synthetic perp'
}

describe('breakdownLabels', () => {
	it('normalizes empty labels to the shared unknown bucket', () => {
		expect(normalizeRWAPerpsBreakdownLabel('')).toBe(UNKNOWN_BREAKDOWN_LABEL)
		expect(normalizeRWAPerpsBreakdownLabel(null)).toBe(UNKNOWN_BREAKDOWN_LABEL)
		expect(normalizeRWAPerpsBreakdownLabel(undefined)).toBe(UNKNOWN_BREAKDOWN_LABEL)
	})

	it('falls back to the coin suffix when reference asset is missing', () => {
		expect(getRWAPerpsBaseAssetBreakdownLabel({ coin: 'xyz:META', referenceAsset: '' })).toBe('META')
	})

	it('falls back to unknown when the coin label is also missing', () => {
		expect(getRWAPerpsCoinBreakdownLabel({ coin: '' })).toBe(UNKNOWN_BREAKDOWN_LABEL)
	})

	it('resolves overview, venue, and shared labels consistently', () => {
		expect(getRWAPerpsSharedBreakdownLabel(baseRow, 'venue')).toBe('xyz')
		expect(getRWAPerpsOverviewBreakdownLabel(baseRow, 'baseAsset')).toBe('Meta')
		expect(getRWAPerpsVenueBreakdownLabel(baseRow, 'assetClass')).toBe('Single stock synthetic perp')
		expect(getRWAPerpsOverviewSnapshotBreakdownLabel({ ...baseRow, category: [], id: 'x' } as any, 'coin')).toBe(
			'xyz:META'
		)
	})
})
