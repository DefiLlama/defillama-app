import { describe, expect, it } from 'vitest'
import { buildStablecoinChartSeriesUrl, buildStablecoinVolumeChartUrl } from './queries.client'

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

describe('buildStablecoinVolumeChartUrl', () => {
	it('encodes global volume requests', () => {
		expect(buildStablecoinVolumeChartUrl({ scope: 'global', chart: 'chain', limit: 10 })).toBe(
			'/api/stablecoins/volume-chart?scope=global&chart=chain&limit=10'
		)
	})

	it('encodes chain scoped volume requests without dimension filters', () => {
		expect(buildStablecoinVolumeChartUrl({ scope: 'chain', chain: 'Ethereum', chart: 'token' })).toBe(
			'/api/stablecoins/volume-chart?scope=chain&chart=token&limit=20&chain=Ethereum'
		)
	})

	it('encodes token scoped volume requests without fallback filters', () => {
		expect(buildStablecoinVolumeChartUrl({ scope: 'token', token: 'USDT', chart: 'chain' })).toBe(
			'/api/stablecoins/volume-chart?scope=token&chart=chain&limit=20&token=USDT'
		)
	})
})
