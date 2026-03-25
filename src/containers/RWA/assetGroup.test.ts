import { describe, expect, it } from 'vitest'
import { UNKNOWN_RWA_ASSET_GROUP, appendUnknownRwaAssetGroup, normalizeRwaAssetGroup } from './assetGroup'

describe('normalizeRwaAssetGroup', () => {
	it('maps missing asset groups to Unknown', () => {
		expect(normalizeRwaAssetGroup(null)).toBe(UNKNOWN_RWA_ASSET_GROUP)
		expect(normalizeRwaAssetGroup(undefined)).toBe(UNKNOWN_RWA_ASSET_GROUP)
		expect(normalizeRwaAssetGroup('')).toBe(UNKNOWN_RWA_ASSET_GROUP)
		expect(normalizeRwaAssetGroup('   ')).toBe(UNKNOWN_RWA_ASSET_GROUP)
	})

	it('preserves valid asset group labels', () => {
		expect(normalizeRwaAssetGroup('Private Credit')).toBe('Private Credit')
	})
})

describe('appendUnknownRwaAssetGroup', () => {
	it('adds Unknown once at the end of the list', () => {
		expect(appendUnknownRwaAssetGroup(['Bonds', 'Private Credit'])).toEqual([
			'Bonds',
			'Private Credit',
			UNKNOWN_RWA_ASSET_GROUP
		])
		expect(appendUnknownRwaAssetGroup(['Bonds', UNKNOWN_RWA_ASSET_GROUP])).toEqual(['Bonds', UNKNOWN_RWA_ASSET_GROUP])
	})
})
