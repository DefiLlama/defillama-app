import { describe, expect, it } from 'vitest'
import type { IRWAAssetsOverview } from './api.types'
import { getActiveMetricValue, getDefiMetricValue, getMetricColumnHeaders, getOnChainMetricValue } from './AssetsTable'

function createSpotAsset(
	overrides: Partial<Extract<IRWAAssetsOverview['assets'][number], { kind: 'spot' }>>
): Extract<IRWAAssetsOverview['assets'][number], { kind: 'spot' }> {
	return {
		id: '1',
		kind: 'spot',
		detailHref: '/rwa/asset/ondo%2Fusdy',
		canonicalMarketId: 'ondo/usdy',
		ticker: 'USDY',
		assetName: 'Ondo USDY',
		primaryChain: null,
		chain: null,
		price: 1,
		openInterest: null,
		volume24h: null,
		volume30d: null,
		assetGroup: 'Treasuries',
		parentPlatform: 'Ondo',
		category: ['Treasuries'],
		assetClass: ['Bonds'],
		accessModel: 'Permissioned',
		type: 'Bond Fund',
		rwaClassification: 'RWA',
		issuer: 'Ondo',
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
		onChainMcap: { total: 200, breakdown: [] },
		activeMcap: { total: 100, breakdown: [] },
		defiActiveTvl: { total: 25, breakdown: [] },
		...overrides
	}
}

function createPerpsAsset(
	overrides: Partial<Extract<IRWAAssetsOverview['assets'][number], { kind: 'perps' }>>
): Extract<IRWAAssetsOverview['assets'][number], { kind: 'perps' }> {
	return {
		id: 'perps-1',
		kind: 'perps',
		detailHref: '/rwa/perps/contract/xyz%3Ausdy',
		contract: 'xyz:USDY',
		ticker: 'xyz:USDY',
		assetName: 'USDY Perp',
		primaryChain: null,
		chain: null,
		price: 1,
		openInterest: 333,
		volume24h: 111,
		volume30d: 222,
		assetGroup: 'Treasuries',
		parentPlatform: 'XYZ',
		category: ['Treasuries'],
		assetClass: ['Bond Perp'],
		accessModel: 'Permissionless',
		type: 'Perp',
		rwaClassification: 'RWA',
		issuer: 'XYZ',
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

describe('RWAAssetsTable', () => {
	it('keeps the original metric headers when the perps toggle is off', () => {
		expect(getMetricColumnHeaders(false)).toEqual({
			active: 'Active Marketcap',
			onChain: 'Onchain Marketcap',
			defi: 'DeFi Active TVL'
		})
	})

	it('uses OI in the active mcap column when the perps toggle is on', () => {
		expect(getMetricColumnHeaders(true)).toEqual({
			active: 'Active Mcap or OI',
			onChain: 'Onchain Marketcap',
			defi: 'DeFi Active TVL'
		})

		expect(getActiveMetricValue(createSpotAsset())).toBe(100)
		expect(getOnChainMetricValue(createSpotAsset())).toBe(200)
		expect(getDefiMetricValue(createSpotAsset())).toBe(25)
		expect(getActiveMetricValue(createPerpsAsset())).toBe(333)
		expect(getOnChainMetricValue(createPerpsAsset())).toBeNull()
		expect(getDefiMetricValue(createPerpsAsset())).toBeNull()
	})
})
