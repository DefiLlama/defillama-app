import { describe, expect, it } from 'vitest'
import {
	buildAssetBreakdownUrl,
	normalizeAssetBreakdownRows,
	parseAssetBreakdownRequest
} from '~/pages/api/rwa/asset-breakdown'

describe('parseAssetBreakdownRequest', () => {
	it('rejects requests when inclusion flags are omitted', () => {
		expect(
			parseAssetBreakdownRequest({
				query: {
					category: 'rwa-yield-wrapper',
					key: 'activeMcap'
				}
			})
		).toBeNull()
	})

	it('accepts explicit true and false inclusion flags', () => {
		expect(
			parseAssetBreakdownRequest({
				query: {
					platform: 'ondo',
					key: 'onChainMcap',
					includeStablecoin: 'true',
					includeGovernance: 'false'
				}
			})
		).toEqual({
			target: { kind: 'platform', slug: 'ondo' },
			key: 'onChainMcap',
			includeStablecoin: true,
			includeGovernance: false
		})
	})
})

describe('buildAssetBreakdownUrl', () => {
	it('forwards both inclusion flags to the upstream asset-breakdown endpoint', () => {
		expect(
			buildAssetBreakdownUrl({
				target: { kind: 'category', slug: 'rwa-yield-wrapper' },
				key: 'defiActiveTvl',
				includeStablecoin: false,
				includeGovernance: true
			})
		).toContain('/chart/category/rwa-yield-wrapper/asset-breakdown?includeStablecoin=false&includeGovernance=true')
	})
})

describe('normalizeAssetBreakdownRows', () => {
	it('normalizes timestamps and sorts rows chronologically for the requested metric', () => {
		expect(
			normalizeAssetBreakdownRows([
				{ timestamp: 2, alpha: 20 },
				{ timestamp: 1, alpha: 10 }
			])
		).toEqual([
			{ timestamp: 1000, alpha: 10 },
			{ timestamp: 2000, alpha: 20 }
		])
	})
})
