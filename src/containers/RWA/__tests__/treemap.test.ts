import { describe, expect, it } from 'vitest'
import { CHART_COLORS } from '~/constants/colors'
import type { RWAAssetOverviewRow } from '../api.types'
import { buildRwaNestedTreemapTreeData, buildRwaTreemapTreeData } from '../treemap'

const baseAsset: RWAAssetOverviewRow = {
	id: 'alpha',
	kind: 'spot',
	detailHref: '/rwa/asset/alpha',
	assetName: 'Alpha',
	ticker: 'ALPHA',
	primaryChain: 'Ethereum',
	chain: ['Ethereum'],
	price: null,
	openInterest: null,
	volume24h: null,
	volume30d: null,
	assetGroup: 'Tokenized Treasuries',
	parentPlatform: null,
	category: ['Government Securities'],
	assetClass: ['Public Credit'],
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
	trueRWA: true,
	onChainMcap: {
		total: 100,
		breakdown: [['Ethereum', 100]]
	},
	activeMcap: {
		total: 100,
		breakdown: [['Ethereum', 100]]
	},
	defiActiveTvl: {
		total: 0,
		breakdown: []
	},
	defiActiveTvlByChain: {
		total: 0,
		breakdown: []
	},
	canonicalMarketId: 'alpha'
}

describe('buildRwaTreemapTreeData', () => {
	it('aggregates duplicate labels and keeps positive-value share output stable', () => {
		const tree = buildRwaTreemapTreeData(
			[
				{ name: 'Beta', value: 50 },
				{ name: 'Alpha', value: 100 },
				{ name: 'Beta', value: 25 },
				{ name: 'Zero', value: 0 },
				{ name: 'Negative', value: -5 }
			],
			'Asset Group'
		)

		expect(tree).toEqual([
			{
				name: 'Alpha',
				path: 'Asset Group/Alpha',
				value: [100, 57.14, 57.14],
				itemStyle: { color: CHART_COLORS[0] }
			},
			{
				name: 'Beta',
				path: 'Asset Group/Beta',
				value: [75, 42.86, 42.86],
				itemStyle: { color: CHART_COLORS[1] }
			}
		])
	})
})

describe('buildRwaNestedTreemapTreeData', () => {
	it('uses chain breakdown values directly while keeping zero rows out of the tree', () => {
		const tree = buildRwaNestedTreemapTreeData({
			assets: [
				{
					...baseAsset,
					onChainMcap: {
						total: 100,
						breakdown: [
							['Ethereum', 100],
							['Base', 0]
						]
					}
				},
				{
					...baseAsset,
					id: 'beta',
					assetName: 'Beta',
					ticker: 'BETA',
					canonicalMarketId: 'beta',
					onChainMcap: {
						total: 50,
						breakdown: [['Ethereum', 50]]
					}
				},
				{
					...baseAsset,
					id: 'zero',
					assetName: 'Zero',
					ticker: 'ZERO',
					canonicalMarketId: 'zero',
					onChainMcap: {
						total: 0,
						breakdown: [['Ethereum', 0]]
					}
				}
			],
			metric: 'onChainMcap',
			rootLabel: 'Chain',
			parentGrouping: 'chain',
			childGrouping: 'assetName'
		})

		expect(tree).toEqual([
			{
				name: 'Ethereum',
				path: 'Chain/Ethereum',
				value: [150, 100, 100],
				itemStyle: { color: '#2b7aca' },
				children: [
					{
						name: 'Alpha',
						path: 'Chain/Ethereum/Alpha',
						value: [100, 66.67, 66.67],
						itemStyle: { color: '#163f69' }
					},
					{
						name: 'Beta',
						path: 'Chain/Ethereum/Beta',
						value: [50, 33.33, 33.33],
						itemStyle: { color: '#6ca5e0' }
					}
				]
			}
		])
	})
})
