import { describe, expect, it } from 'vitest'
import { buildStablecoinChartSeriesUrl } from './queries.client'

describe('buildStablecoinChartSeriesUrl', () => {
	it('encodes overview filters and skips undefined values', () => {
		const url = buildStablecoinChartSeriesUrl({
			scope: 'overview',
			chain: 'All',
			chart: 'tokenMcaps',
			filters: {
				attribute: ['STABLE', 'YIELDBEARING'],
				excludePegtype: 'PEGGEDEUR',
				backing: undefined,
				minMcap: '100'
			},
			enabled: false
		})

		expect(url).toBe(
			'/api/stablecoins/chart-series?scope=overview&chart=tokenMcaps&chain=All&attribute=STABLE&attribute=YIELDBEARING&excludePegtype=PEGGEDEUR&minMcap=100'
		)
	})

	it('encodes unreleased asset chart requests', () => {
		expect(
			buildStablecoinChartSeriesUrl({
				scope: 'asset',
				stablecoin: 'tether',
				chart: 'totalCirc',
				includeUnreleased: true
			})
		).toBe('/api/stablecoins/chart-series?scope=asset&chart=totalCirc&stablecoin=tether&unreleased=true')
	})
})
