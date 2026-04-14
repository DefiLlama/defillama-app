import { describe, expect, it } from 'vitest'
import type { IRWAAssetsOverview } from './api.types'
import { aggregateRwaMetricData } from './chartAggregation'

const assets: IRWAAssetsOverview['assets'] = [
	{
		id: '1',
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
	it('aggregates all ticker series into a single Total series when total mode is selected', () => {
		expect(
			aggregateRwaMetricData(
				assets,
				[
					{ timestamp: 1, AAA: 100, BBB: 90, CCC: 50 },
					{ timestamp: 2, AAA: 120, BBB: 80, CCC: 40 }
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
					{ timestamp: 1, AAA: 100, BBB: 90, CCC: 50 },
					{ timestamp: 2, AAA: 120, BBB: 80, CCC: 40 }
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
				[{ timestamp: 1, AAA: 100, BBB: 50 }],
				'assetGroup'
			)
		).toEqual({
			source: [{ timestamp: 1, Stablecoins: 100, Unknown: 50 }],
			dimensions: ['timestamp', 'Stablecoins', 'Unknown']
		})
	})
})
