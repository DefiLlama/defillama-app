import { describe, expect, it } from 'vitest'
import { buildRWAPerpsTreemapTreeData } from '../treemap'

const baseMarket = {
	id: 'xyz:meta',
	timestamp: 1775011512,
	contract: 'xyz:META',
	venue: 'xyz',
	openInterest: 100,
	volume24h: 50,
	price: 500,
	priceChange24h: 5,
	fundingRate: 0.00001,
	premium: 0.0002,
	cumulativeFunding: 10,
	referenceAsset: 'Meta',
	referenceAssetGroup: 'Equities',
	assetClass: ['Stock Perp'],
	parentPlatform: 'trade[XYZ]',
	pair: '',
	marginAsset: 'USDC',
	settlementAsset: 'USDC',
	category: ['RWA Perps'],
	issuer: 'XYZ',
	website: ['https://trade.xyz/'],
	oracleProvider: 'Pyth equity feed',
	description: 'Perpetual market',
	accessModel: 'Permissionless',
	rwaClassification: 'Programmable Finance',
	makerFeeRate: 0.0002,
	takerFeeRate: 0.0005,
	deployerFeeShare: 0.5,
	oraclePx: 501,
	midPx: 500.5,
	prevDayPx: 480,
	maxLeverage: 10,
	szDecimals: 2,
	volume7d: 300,
	volume30d: 1000,
	volumeAllTime: 5000,
	estimatedProtocolFees24h: 1,
	estimatedProtocolFees7d: 3,
	estimatedProtocolFees30d: 10,
	estimatedProtocolFeesAllTime: 50
}

describe('buildRWAPerpsTreemapTreeData', () => {
	it('builds overview nested tree data by venue -> asset class', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{ ...baseMarket, id: 'xyz:meta', venue: 'xyz', assetClass: ['Stock Perp'] },
				{
					...baseMarket,
					id: 'xyz:gold',
					contract: 'xyz:GOLD',
					referenceAsset: 'Gold',
					venue: 'xyz',
					assetClass: ['Commodity Perp'],
					openInterest: 50
				},
				{
					...baseMarket,
					id: 'flx:tsla',
					contract: 'flx:TSLA',
					referenceAsset: 'Tesla',
					venue: 'flx',
					assetClass: ['Stock Perp'],
					openInterest: 75
				}
			],
			metric: 'openInterest',
			parentGrouping: 'venue',
			nestedBy: 'assetClass'
		})

		expect(tree[0]).toMatchObject({
			name: 'xyz',
			path: 'Venue/xyz'
		})
		expect(tree[0].children?.map((child) => child.name)).toEqual(['Stock Perp', 'Commodity Perp'])
	})

	it('builds overview nested tree data by venue -> contract', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{
					...baseMarket,
					id: 'xyz:meta',
					venue: 'xyz',
					referenceAsset: 'Meta',
					contract: 'xyz:META'
				},
				{
					...baseMarket,
					id: 'flx:nvda',
					contract: 'flx:NVDA',
					venue: 'flx',
					referenceAsset: 'NVIDIA',
					openInterest: 150
				}
			],
			metric: 'openInterest',
			parentGrouping: 'venue',
			nestedBy: 'contract'
		})

		expect(tree[0]).toMatchObject({
			name: 'flx',
			path: 'Venue/flx'
		})
		expect(tree[0].children?.map((child) => child.name)).toEqual(['flx:NVDA'])
	})

	it('builds a flat overview treemap without parent wrapper nodes when nested grouping is none', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{ ...baseMarket, id: 'xyz:meta', venue: 'xyz' },
				{ ...baseMarket, id: 'flx:gold', contract: 'flx:GOLD', referenceAsset: 'Gold', venue: 'flx', openInterest: 50 }
			],
			metric: 'openInterest',
			parentGrouping: 'venue',
			nestedBy: 'none'
		})

		expect(tree).toEqual([
			expect.objectContaining({ name: 'xyz', path: 'Venue/xyz' }),
			expect.objectContaining({ name: 'flx', path: 'Venue/flx' })
		])
	})

	it('builds overview nested tree data by asset class -> contract', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{
					...baseMarket,
					id: 'xyz:meta',
					venue: 'xyz',
					assetClass: ['Stock Perp'],
					referenceAsset: 'Meta',
					contract: 'xyz:META'
				},
				{
					...baseMarket,
					id: 'xyz:nvda',
					contract: 'xyz:NVDA',
					venue: 'xyz',
					assetClass: ['Stock Perp'],
					referenceAsset: 'NVIDIA',
					openInterest: 150
				}
			],
			metric: 'openInterest',
			parentGrouping: 'assetClass',
			nestedBy: 'contract'
		})

		expect(tree[0]).toMatchObject({
			name: 'Stock Perp',
			path: 'Asset Class/Stock Perp'
		})
		expect(tree[0].children?.map((child) => child.name)).toEqual(['xyz:NVDA', 'xyz:META'])
	})

	it('builds overview nested tree data by reference asset -> contract', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{ ...baseMarket, id: 'xyz:meta', contract: 'xyz:META', referenceAsset: 'Meta', openInterest: 100 },
				{ ...baseMarket, id: 'flx:meta', contract: 'flx:META', venue: 'flx', referenceAsset: 'Meta', openInterest: 80 }
			],
			metric: 'openInterest',
			parentGrouping: 'baseAsset',
			nestedBy: 'contract'
		})

		expect(tree[0]).toMatchObject({
			name: 'Meta',
			path: 'Base Asset/Meta'
		})
		expect(tree[0].children?.map((child) => child.name)).toEqual(['xyz:META', 'flx:META'])
	})

	it('builds overview nested tree data by asset group -> base asset', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{ ...baseMarket, id: 'xyz:meta', referenceAssetGroup: 'Equities', referenceAsset: 'Meta', openInterest: 100 },
				{
					...baseMarket,
					id: 'xyz:nvda',
					contract: 'xyz:NVDA',
					referenceAssetGroup: 'Equities',
					referenceAsset: 'NVIDIA',
					openInterest: 150
				},
				{
					...baseMarket,
					id: 'xyz:gold',
					contract: 'xyz:GOLD',
					referenceAssetGroup: 'Commodities',
					referenceAsset: 'Gold',
					openInterest: 50
				}
			],
			metric: 'openInterest',
			parentGrouping: 'assetGroup',
			nestedBy: 'baseAsset'
		})

		expect(tree[0]).toMatchObject({
			name: 'Equities',
			path: 'Asset Group/Equities'
		})
		expect(tree[0].children?.map((child) => child.name)).toEqual(['NVIDIA', 'Meta'])
	})

	it('builds venue detail nested trees by asset class -> contract', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'venue',
			markets: [
				{
					...baseMarket,
					id: 'xyz:meta',
					venue: 'xyz',
					assetClass: ['Stock Perp'],
					referenceAsset: 'Meta',
					contract: 'xyz:META'
				},
				{
					...baseMarket,
					id: 'xyz:nvda',
					contract: 'xyz:NVDA',
					venue: 'xyz',
					assetClass: ['Stock Perp'],
					referenceAsset: 'NVIDIA',
					openInterest: 150
				},
				{
					...baseMarket,
					id: 'xyz:gold',
					contract: 'xyz:GOLD',
					venue: 'xyz',
					assetClass: ['Commodity Perp'],
					referenceAsset: 'Gold',
					openInterest: 50
				}
			],
			metric: 'openInterest',
			parentGrouping: 'assetClass',
			nestedBy: 'contract',
			venueLabel: 'xyz'
		})

		expect(tree[0]).toMatchObject({
			name: 'Stock Perp',
			path: 'xyz/Stock Perp'
		})
		expect(tree[0].children?.map((child) => child.name)).toEqual(['xyz:NVDA', 'xyz:META'])
	})

	it('builds venue detail nested trees by reference asset -> contract', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'venue',
			markets: [
				{ ...baseMarket, id: 'xyz:meta', contract: 'xyz:META', referenceAsset: 'Meta', openInterest: 100 },
				{ ...baseMarket, id: 'xyz:meta-2', contract: 'xyz:META-2', referenceAsset: 'Meta', openInterest: 80 }
			],
			metric: 'openInterest',
			parentGrouping: 'baseAsset',
			nestedBy: 'contract',
			venueLabel: 'xyz'
		})

		expect(tree[0]).toMatchObject({
			name: 'Meta',
			path: 'xyz/Meta'
		})
		expect(tree[0].children?.map((child) => child.name)).toEqual(['xyz:META', 'xyz:META-2'])
	})

	it('builds venue detail nested trees by asset group -> base asset', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'venue',
			markets: [
				{ ...baseMarket, id: 'xyz:meta', referenceAssetGroup: 'Equities', referenceAsset: 'Meta', openInterest: 100 },
				{
					...baseMarket,
					id: 'xyz:nvda',
					contract: 'xyz:NVDA',
					referenceAssetGroup: 'Equities',
					referenceAsset: 'NVIDIA',
					openInterest: 80
				}
			],
			metric: 'openInterest',
			parentGrouping: 'assetGroup',
			nestedBy: 'baseAsset',
			venueLabel: 'xyz'
		})

		expect(tree[0]).toMatchObject({
			name: 'Equities',
			path: 'xyz/Equities'
		})
		expect(tree[0].children?.map((child) => child.name)).toEqual(['Meta', 'NVIDIA'])
	})

	it('keeps markets metric as numeric counts in flat trees', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'venue',
			markets: [
				{ ...baseMarket, id: 'xyz:meta', referenceAsset: 'Meta' },
				{ ...baseMarket, id: 'xyz:meta-2', referenceAsset: 'Meta' },
				{ ...baseMarket, id: 'xyz:nvda', contract: 'xyz:NVDA', referenceAsset: 'NVIDIA' }
			],
			metric: 'markets',
			parentGrouping: 'baseAsset',
			nestedBy: 'none',
			venueLabel: 'xyz'
		})

		expect(tree).toEqual([
			expect.objectContaining({ name: 'Meta', value: [2, 66.67, 66.67] }),
			expect.objectContaining({ name: 'NVIDIA', value: [1, 33.33, 33.33] })
		])
	})

	it('builds a flat overview treemap for contract parent grouping', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{
					...baseMarket,
					id: 'xyz:gold',
					contract: 'xyz:GOLD',
					venue: 'xyz',
					referenceAsset: 'Gold',
					openInterest: 80
				},
				{
					...baseMarket,
					id: 'flx:gold',
					contract: 'flx:GOLD',
					venue: 'flx',
					referenceAsset: 'Gold',
					openInterest: 20
				}
			],
			metric: 'openInterest',
			parentGrouping: 'contract',
			nestedBy: 'none'
		})

		expect(tree).toEqual([
			expect.objectContaining({ name: 'xyz:GOLD', path: 'Contract/xyz:GOLD' }),
			expect.objectContaining({ name: 'flx:GOLD', path: 'Contract/flx:GOLD' })
		])
	})

	it('keeps a stable root label for flat base-asset treemaps', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{ ...baseMarket, id: 'xyz:meta', referenceAsset: 'Meta', openInterest: 100 },
				{ ...baseMarket, id: 'xyz:nvda', contract: 'xyz:NVDA', referenceAsset: 'NVIDIA', openInterest: 80 }
			],
			metric: 'markets',
			parentGrouping: 'baseAsset',
			nestedBy: 'none'
		})

		expect(tree).toEqual([
			expect.objectContaining({ name: 'Meta', path: 'Base Asset/Meta' }),
			expect.objectContaining({ name: 'NVIDIA', path: 'Base Asset/NVIDIA' })
		])
	})

	it('keeps nested share semantics explicit in the value tuple', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{
					...baseMarket,
					id: 'xyz:meta',
					venue: 'xyz',
					assetClass: ['Stock Perp'],
					openInterest: 100
				},
				{
					...baseMarket,
					id: 'xyz:gold',
					contract: 'xyz:GOLD',
					venue: 'xyz',
					referenceAsset: 'Gold',
					assetClass: ['Commodity Perp'],
					openInterest: 50
				},
				{
					...baseMarket,
					id: 'flx:tsla',
					contract: 'flx:TSLA',
					venue: 'flx',
					referenceAsset: 'Tesla',
					openInterest: 75
				}
			],
			metric: 'openInterest',
			parentGrouping: 'venue',
			nestedBy: 'assetClass'
		})

		expect(tree[0]).toMatchObject({
			name: 'xyz',
			value: [150, 66.67, 66.67]
		})
		expect(tree[0].children?.[0]).toMatchObject({
			name: 'Stock Perp',
			value: [100, 66.67, 44.44]
		})
	})

	it('uses the same fallback bucket labels as the non-treemap breakdowns', () => {
		const tree = buildRWAPerpsTreemapTreeData({
			mode: 'overview',
			markets: [
				{
					...baseMarket,
					id: 'missing:1',
					contract: 'missing:META',
					venue: '',
					assetClass: null,
					referenceAsset: null,
					openInterest: 10
				},
				{
					...baseMarket,
					id: 'missing:2',
					contract: '',
					venue: 'xyz',
					assetClass: null,
					referenceAsset: null,
					openInterest: 5
				}
			],
			metric: 'openInterest',
			parentGrouping: 'venue',
			nestedBy: 'assetClass'
		})

		expect(tree.map((node) => node.name)).toEqual(['Unknown', 'xyz'])
		expect(tree[0].children?.map((child) => child.name)).toEqual(['Unknown'])
		expect(
			buildRWAPerpsTreemapTreeData({
				mode: 'overview',
				markets: [
					{
						...baseMarket,
						id: 'missing:3',
						contract: 'xyz:META',
						referenceAsset: null,
						openInterest: 10
					}
				],
				metric: 'openInterest',
				parentGrouping: 'baseAsset',
				nestedBy: 'none'
			})[0]
		).toMatchObject({
			name: 'META'
		})
		expect(
			buildRWAPerpsTreemapTreeData({
				mode: 'overview',
				markets: [
					{
						...baseMarket,
						id: 'missing:4',
						contract: '',
						referenceAsset: null,
						openInterest: 10
					}
				],
				metric: 'openInterest',
				parentGrouping: 'contract',
				nestedBy: 'none'
			})[0]
		).toMatchObject({
			name: 'Unknown'
		})
	})
})
