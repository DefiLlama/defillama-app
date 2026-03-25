import { describe, expect, it } from 'vitest'
import type { IRWAPlatformsOverviewRow } from './api.types'
import { getRWAPlatformsTableData } from './platformTableData'

const platforms: IRWAPlatformsOverviewRow[] = [
	{
		platform: 'Centrifuge',
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
			assetIssuers: ['Issuer Both']
		}
	}
]

describe('getRWAPlatformsTableData', () => {
	it('includes base and governance buckets by default', () => {
		expect(getRWAPlatformsTableData(platforms, false)).toEqual([
			{
				platform: 'Centrifuge',
				onChainMcap: 130,
				activeMcap: 115,
				defiActiveTvl: 85,
				assetCount: 5
			}
		])
	})

	it('adds stablecoin buckets when enabled', () => {
		expect(getRWAPlatformsTableData(platforms, true)).toEqual([
			{
				platform: 'Centrifuge',
				onChainMcap: 190,
				activeMcap: 165,
				defiActiveTvl: 107,
				assetCount: 10
			}
		])
	})
})
