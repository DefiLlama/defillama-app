import { describe, expect, it } from 'vitest'
import type { RWAStatsSegmented } from './api.types'
import { getRWAOverviewInclusion, getRWAOverviewTableData } from './overviewTableData'

const row: RWAStatsSegmented = {
	base: {
		onChainMcap: 100,
		activeMcap: 90,
		defiActiveTvl: 80,
		assetCount: 3,
		assetIssuers: ['Issuer A']
	},
	stablecoinsOnly: {
		onChainMcap: 20,
		activeMcap: 15,
		defiActiveTvl: 10,
		assetCount: 1,
		assetIssuers: ['Issuer Stable']
	},
	governanceOnly: {
		onChainMcap: 30,
		activeMcap: 25,
		defiActiveTvl: 5,
		assetCount: 2,
		assetIssuers: ['Issuer Gov']
	},
	stablecoinsAndGovernance: {
		onChainMcap: 40,
		activeMcap: 35,
		defiActiveTvl: 12,
		assetCount: 4,
		assetIssuers: ['Issuer Stable', 'Issuer Both']
	}
}

describe('getRWAOverviewTableData', () => {
	it('excludes stablecoins and governance by default', () => {
		expect(getRWAOverviewTableData(row, getRWAOverviewInclusion(false, false))).toEqual({
			onChainMcap: 100,
			activeMcap: 90,
			defiActiveTvl: 80,
			assetCount: 3,
			assetIssuers: 1
		})
	})

	it('includes stablecoins only', () => {
		expect(getRWAOverviewTableData(row, getRWAOverviewInclusion(true, false))).toEqual({
			onChainMcap: 160,
			activeMcap: 140,
			defiActiveTvl: 102,
			assetCount: 8,
			assetIssuers: 3
		})
	})

	it('includes governance only', () => {
		expect(getRWAOverviewTableData(row, getRWAOverviewInclusion(false, true))).toEqual({
			onChainMcap: 170,
			activeMcap: 150,
			defiActiveTvl: 97,
			assetCount: 9,
			assetIssuers: 4
		})
	})

	it('includes all buckets when both flags are on', () => {
		expect(getRWAOverviewTableData(row, getRWAOverviewInclusion(true, true))).toEqual({
			onChainMcap: 190,
			activeMcap: 165,
			defiActiveTvl: 107,
			assetCount: 10,
			assetIssuers: 4
		})
	})
})
