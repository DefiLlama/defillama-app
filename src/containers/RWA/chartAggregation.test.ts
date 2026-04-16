import { describe, expect, it } from 'vitest'
import type { IRWAAssetsOverview } from './api.types'
import { aggregateRwaMetricData, appendRwaChartDatasetTotal, selectRwaChartDatasetSeries } from './chartAggregation'

const assets: IRWAAssetsOverview['assets'] = [
	{
		id: '1',
		canonicalMarketId: 'ondo/usdy',
		ticker: 'AAA',
		assetName: 'Alpha',
		parentPlatform: 'Centrifuge',
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null
	},
	{
		id: '2',
		canonicalMarketId: 'superstate/ustb',
		ticker: 'BBB',
		assetName: 'Beta',
		parentPlatform: ['Centrifuge', 'Maple'],
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null
	},
	{
		id: '3',
		canonicalMarketId: 'blackrock/buidl',
		ticker: 'CCC',
		assetName: 'Gamma',
		parentPlatform: null,
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null
	}
]

describe('aggregateRwaMetricData', () => {
	it('aggregates all asset series into a single Total series when total mode is selected', () => {
		expect(
			aggregateRwaMetricData(
				assets,
				[
					{ timestamp: 1, 'ondo/usdy': 100, 'superstate/ustb': 90, 'blackrock/buidl': 50 },
					{ timestamp: 2, 'ondo/usdy': 120, 'superstate/ustb': 80, 'blackrock/buidl': 40 }
				],
				'total'
			)
		).toEqual({
			source: [
				{ timestamp: 1, Total: 240 },
				{ timestamp: 2, Total: 240 }
			],
			dimensions: ['timestamp', 'Total']
		})
	})

	it('aggregates platform series for scalar, array, and missing parentPlatform values', () => {
		expect(
			aggregateRwaMetricData(
				assets,
				[
					{ timestamp: 1, 'ondo/usdy': 100, 'superstate/ustb': 90, 'blackrock/buidl': 50 },
					{ timestamp: 2, 'ondo/usdy': 120, 'superstate/ustb': 80, 'blackrock/buidl': 40 }
				],
				'platform'
			)
		).toEqual({
			source: [
				{ timestamp: 1, Centrifuge: 145, Maple: 45, Unknown: 50 },
				{ timestamp: 2, Centrifuge: 160, Maple: 40, Unknown: 40 }
			],
			dimensions: ['timestamp', 'Centrifuge', 'Maple', 'Unknown']
		})
	})

	it('buckets missing assetGroup values into Unknown instead of dropping them', () => {
		expect(
			aggregateRwaMetricData(
				[
					{
						id: '1',
						canonicalMarketId: 'circle/usdc',
						ticker: 'AAA',
						assetName: 'Alpha',
						assetGroup: 'Stablecoins',
						parentPlatform: 'Centrifuge',
						trueRWA: false,
						onChainMcap: null,
						activeMcap: null,
						defiActiveTvl: null
					},
					{
						id: '2',
						canonicalMarketId: 'unknown/asset',
						ticker: 'BBB',
						assetName: 'Beta',
						assetGroup: null,
						parentPlatform: 'Maple',
						trueRWA: false,
						onChainMcap: null,
						activeMcap: null,
						defiActiveTvl: null
					}
				],
				[{ timestamp: 1, 'circle/usdc': 100, 'unknown/asset': 50 }],
				'assetGroup'
			)
		).toEqual({
			source: [{ timestamp: 1, Stablecoins: 100, Unknown: 50 }],
			dimensions: ['timestamp', 'Stablecoins', 'Unknown']
		})
	})
})

describe('appendRwaChartDatasetTotal', () => {
	it('adds a Total column and promotes it to the first visible series dimension', () => {
		expect(
			appendRwaChartDatasetTotal({
				source: [
					{ timestamp: 1, Treasuries: 100, Credit: 40 },
					{ timestamp: 2, Treasuries: 90, Credit: 60 }
				],
				dimensions: ['timestamp', 'Treasuries', 'Credit']
			})
		).toEqual({
			source: [
				{ timestamp: 1, Treasuries: 100, Credit: 40, Total: 140 },
				{ timestamp: 2, Treasuries: 90, Credit: 60, Total: 150 }
			],
			dimensions: ['timestamp', 'Total', 'Treasuries', 'Credit']
		})
	})
})

describe('selectRwaChartDatasetSeries', () => {
	it('projects a dataset down to the requested series dimensions', () => {
		expect(
			selectRwaChartDatasetSeries(
				{
					source: [{ timestamp: 1, Treasuries: 100, Credit: 40, Total: 140 }],
					dimensions: ['timestamp', 'Treasuries', 'Credit']
				},
				['Total']
			)
		).toEqual({
			source: [{ timestamp: 1, Treasuries: 100, Credit: 40, Total: 140 }],
			dimensions: ['timestamp', 'Total']
		})
	})
})
