import { describe, expect, it } from 'vitest'
import type { IRWAAssetsOverview } from './api.types'
import {
	aggregateRwaMetricData,
	appendRwaChartDatasetTotal,
	buildRwaOpenInterestDataset,
	mergeRwaChartDatasets,
	renameRwaChartDatasetTotal,
	selectRwaChartDatasetSeries
} from './chartAggregation'

function createSpotAsset(
	overrides: Partial<Extract<IRWAAssetsOverview['assets'][number], { kind: 'spot' }>> = {}
): Extract<IRWAAssetsOverview['assets'][number], { kind: 'spot' }> {
	return {
		id: '1',
		kind: 'spot',
		detailHref: '/rwa/asset/ondo%2Fusdy',
		canonicalMarketId: 'ondo/usdy',
		ticker: 'AAA',
		assetName: 'Alpha',
		primaryChain: null,
		chain: null,
		price: null,
		openInterest: null,
		volume24h: null,
		volume30d: null,
		assetGroup: null,
		parentPlatform: null,
		category: null,
		assetClass: null,
		accessModel: null,
		type: null,
		rwaClassification: null,
		issuer: null,
		redeemable: null,
		attestations: null,
		cexListed: null,
		kycForMintRedeem: null,
		kycAllowlistedWhitelistedToTransferHold: null,
		transferable: null,
		selfCustody: null,
		stablecoin: null,
		governance: null,
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null,
		...overrides
	}
}

function createPerpsAsset(
	overrides: Partial<Extract<IRWAAssetsOverview['assets'][number], { kind: 'perps' }>> = {}
): Extract<IRWAAssetsOverview['assets'][number], { kind: 'perps' }> {
	return {
		id: 'perps-1',
		kind: 'perps',
		detailHref: '/rwa/perps/contract/xyz%3Aalpha',
		contract: 'xyz:alpha',
		ticker: 'xyz:alpha',
		assetName: 'Alpha Perp',
		primaryChain: null,
		chain: null,
		price: 1,
		openInterest: 1,
		volume24h: 2,
		volume30d: 3,
		assetGroup: null,
		parentPlatform: null,
		category: null,
		assetClass: null,
		accessModel: null,
		type: 'Perp',
		rwaClassification: null,
		issuer: null,
		redeemable: null,
		attestations: null,
		cexListed: null,
		kycForMintRedeem: null,
		kycAllowlistedWhitelistedToTransferHold: null,
		transferable: null,
		selfCustody: null,
		stablecoin: null,
		governance: null,
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null,
		...overrides
	}
}

const assets: IRWAAssetsOverview['assets'] = [
	createSpotAsset({ id: '1', canonicalMarketId: 'ondo/usdy', parentPlatform: 'Centrifuge' }),
	createSpotAsset({
		id: '2',
		canonicalMarketId: 'superstate/ustb',
		ticker: 'BBB',
		assetName: 'Beta',
		parentPlatform: ['Centrifuge', 'Maple']
	}),
	createSpotAsset({
		id: '3',
		canonicalMarketId: 'blackrock/buidl',
		ticker: 'CCC',
		assetName: 'Gamma'
	})
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
					createSpotAsset({
						id: '1',
						canonicalMarketId: 'circle/usdc',
						assetGroup: 'Stablecoins',
						parentPlatform: 'Centrifuge'
					}),
					createSpotAsset({
						id: '2',
						canonicalMarketId: 'unknown/asset',
						ticker: 'BBB',
						assetName: 'Beta',
						parentPlatform: 'Maple'
					}),
					createPerpsAsset({
						id: 'perps-2',
						contract: 'unknown/asset',
						assetGroup: 'Stablecoins'
					})
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

describe('renameRwaChartDatasetTotal', () => {
	it('renames the Total series to the selected metric label', () => {
		expect(
			renameRwaChartDatasetTotal(
				{
					source: [{ timestamp: 1, Total: 140, Treasuries: 100 }],
					dimensions: ['timestamp', 'Total', 'Treasuries']
				},
				'activeMcap'
			)
		).toEqual({
			source: [{ timestamp: 1, 'Total Active Mcap': 140, Treasuries: 100 }],
			dimensions: ['timestamp', 'Total Active Mcap', 'Treasuries']
		})
	})
})

describe('buildRwaOpenInterestDataset', () => {
	it('collapses filtered perps contracts into a single RWA Perps OI line', () => {
		expect(
			buildRwaOpenInterestDataset(
				[
					createSpotAsset({ canonicalMarketId: 'ondo/usdy' }),
					createPerpsAsset({ contract: 'xyz:alpha' }),
					createPerpsAsset({ id: 'perps-2', contract: 'xyz:beta' })
				],
				{
					source: [
						{ timestamp: 1, 'xyz:alpha': 10, 'xyz:beta': 15, 'xyz:gamma': 100 },
						{ timestamp: 2, 'xyz:alpha': 12, 'xyz:beta': 18, 'xyz:gamma': 120 }
					],
					dimensions: ['timestamp', 'xyz:gamma', 'xyz:beta', 'xyz:alpha']
				}
			)
		).toEqual({
			source: [
				{ timestamp: 1, 'RWA Perps OI': 25 },
				{ timestamp: 2, 'RWA Perps OI': 30 }
			],
			dimensions: ['timestamp', 'RWA Perps OI']
		})
	})
})

describe('mergeRwaChartDatasets', () => {
	it('merges a spot chart dataset with the RWA Perps OI overlay line', () => {
		expect(
			mergeRwaChartDatasets(
				{
					source: [{ timestamp: 1, 'Total Active Mcap': 100, Treasuries: 100 }],
					dimensions: ['timestamp', 'Total Active Mcap', 'Treasuries']
				},
				{
					source: [{ timestamp: 1, 'RWA Perps OI': 25 }],
					dimensions: ['timestamp', 'RWA Perps OI']
				}
			)
		).toEqual({
			source: [{ timestamp: 1, 'Total Active Mcap': 100, Treasuries: 100, 'RWA Perps OI': 25 }],
			dimensions: ['timestamp', 'Total Active Mcap', 'Treasuries', 'RWA Perps OI']
		})
	})
})
