import { describe, expect, it } from 'vitest'
import type { RWAAssetOverviewRow } from '../api.types'
import {
	filterRwaAssetOverviewRows,
	hasPerpsOverlayBlockingFiltersFromQuery,
	parseAttributeFilterStatesParam,
	type RWAFilterState
} from '../filterState'

const baseAsset: RWAAssetOverviewRow = {
	id: 'asset-1',
	kind: 'spot',
	detailHref: '/rwa/asset/asset-1',
	canonicalMarketId: 'asset-1',
	assetName: 'Asset One',
	logo: null,
	ticker: 'ONE',
	primaryChain: null,
	chain: null,
	price: null,
	openInterest: null,
	volume24h: null,
	volume30d: null,
	assetGroup: 'Treasuries',
	parentPlatform: null,
	category: ['Treasuries'],
	assetClass: null,
	accessModel: null,
	type: 'Asset',
	rwaClassification: null,
	issuer: 'Issuer One',
	redeemable: null,
	attestations: null,
	cexListed: null,
	kycForMintRedeem: null,
	kycAllowlistedWhitelistedToTransferHold: null,
	transferable: null,
	selfCustody: null,
	stablecoin: false,
	governance: false,
	trueRWA: true,
	onChainMcap: { total: 100, breakdown: [['Ethereum', 100]] },
	activeMcap: { total: 50, breakdown: [['Ethereum', 50]] },
	defiActiveTvl: { total: 25, breakdown: [['Aave', 25]] },
	defiActiveTvlByChain: { total: 25, breakdown: [['Ethereum', 25]] }
}

const baseFilterState: RWAFilterState = {
	isPlatformMode: false,
	selectedAssetNames: [],
	selectedTypes: ['Asset'],
	selectedCategories: ['Treasuries'],
	selectedPlatforms: [],
	selectedAssetGroups: ['Treasuries'],
	selectedAssetClasses: [],
	selectedRwaClassifications: [],
	selectedAccessModels: [],
	selectedIssuers: ['Issuer One'],
	selectedRedeemableStates: ['yes', 'no', 'unknown'],
	selectedAttestationsStates: ['yes', 'no', 'unknown'],
	selectedCexListedStates: ['yes', 'no', 'unknown'],
	selectedKycForMintRedeemStates: ['yes', 'no', 'unknown'],
	selectedKycAllowlistedWhitelistedToTransferHoldStates: ['yes', 'no', 'unknown'],
	selectedTransferableStates: ['yes', 'no', 'unknown'],
	selectedSelfCustodyStates: ['yes', 'no', 'unknown'],
	includeStablecoins: true,
	includeGovernance: true,
	includeRwaPerps: true,
	hasPerpsOverlayBlockingFilters: false,
	minDefiActiveTvlToOnChainMcapPct: null,
	maxDefiActiveTvlToOnChainMcapPct: null,
	minActiveMcapToOnChainMcapPct: null,
	maxActiveMcapToOnChainMcapPct: null,
	minDefiActiveTvlToActiveMcapPct: null,
	maxDefiActiveTvlToActiveMcapPct: null
}

describe('RWA filter state', () => {
	it('parses attribute filter state params', () => {
		expect(parseAttributeFilterStatesParam(undefined)).toEqual(['yes', 'no', 'unknown'])
		expect(parseAttributeFilterStatesParam('yes')).toEqual(['yes'])
		expect(parseAttributeFilterStatesParam(['yes', 'unknown'])).toEqual(['yes', 'unknown'])
		expect(parseAttributeFilterStatesParam('none')).toEqual([])
		expect(parseAttributeFilterStatesParam('invalid')).toEqual(['yes', 'no', 'unknown'])
	})

	it('treats asset-only query filters as perps overlay blockers', () => {
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ types: 'Asset' }, { mode: 'chain' })).toBe(true)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ minActiveMcapToOnChainMcapPct: '10' }, { mode: 'chain' })).toBe(
			true
		)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ kycForMintRedeemStates: 'yes' }, { mode: 'chain' })).toBe(true)
	})

	it('does not treat shared filters or includeRwaPerps as perps overlay blockers', () => {
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ categories: 'Treasuries' }, { mode: 'chain' })).toBe(false)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ platforms: 'Ondo' }, { mode: 'chain' })).toBe(false)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ includeRwaPerps: 'false' }, { mode: 'chain' })).toBe(false)
	})

	it('treats stablecoin and governance inclusion overrides as perps overlay blockers', () => {
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ includeStablecoins: 'false' }, { mode: 'chain' })).toBe(false)
		expect(hasPerpsOverlayBlockingFiltersFromQuery({ includeStablecoins: 'true' }, { mode: 'chain' })).toBe(true)
		expect(
			hasPerpsOverlayBlockingFiltersFromQuery(
				{ includeGovernance: 'false' },
				{ mode: 'category', categorySlug: 'rwa-yield-wrapper' }
			)
		).toBe(true)
	})

	it('does not include ratio-filtered rows with invalid numerator or denominator values', () => {
		const filterState: RWAFilterState = {
			...baseFilterState,
			minActiveMcapToOnChainMcapPct: 1
		}

		expect(filterRwaAssetOverviewRows([baseAsset], filterState).map((asset) => asset.id)).toEqual(['asset-1'])
		expect(
			filterRwaAssetOverviewRows(
				[
					{
						...baseAsset,
						id: 'zero-denominator',
						onChainMcap: { total: 0, breakdown: [['Ethereum', 0]] }
					},
					{
						...baseAsset,
						id: 'invalid-numerator',
						activeMcap: { total: Number.NaN, breakdown: [['Ethereum', Number.NaN]] }
					}
				],
				filterState
			)
		).toEqual([])
	})
})
