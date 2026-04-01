import { describe, expect, it } from 'vitest'
import { buildTickerBreakdownUrl, parseTickerBreakdownRequest } from '~/pages/api/rwa/ticker-breakdown'

describe('parseTickerBreakdownRequest', () => {
	it('rejects requests when inclusion flags are omitted', () => {
		expect(
			parseTickerBreakdownRequest({
				query: {
					category: 'rwa-yield-wrapper',
					key: 'activeMcap'
				}
			})
		).toBeNull()
	})

	it('accepts explicit true and false inclusion flags', () => {
		expect(
			parseTickerBreakdownRequest({
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

describe('buildTickerBreakdownUrl', () => {
	it('forwards both inclusion flags to the upstream ticker-breakdown endpoint', () => {
		expect(
			buildTickerBreakdownUrl({
				target: { kind: 'category', slug: 'rwa-yield-wrapper' },
				key: 'defiActiveTvl',
				includeStablecoin: false,
				includeGovernance: true
			})
		).toContain('/chart/category/rwa-yield-wrapper/ticker-breakdown?includeStablecoin=false&includeGovernance=true')
	})
})
