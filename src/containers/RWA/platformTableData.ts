import type { IRWAPlatformsOverviewRow } from './api.types'

export function getRWAPlatformsTableData(platforms: IRWAPlatformsOverviewRow[], includeStablecoins: boolean) {
	return platforms.map((row) => ({
		platform: row.platform,
		assetCount:
			row.base.assetCount +
			row.governanceOnly.assetCount +
			(includeStablecoins ? row.stablecoinsOnly.assetCount + row.stablecoinsAndGovernance.assetCount : 0),
		activeMcap:
			row.base.activeMcap +
			row.governanceOnly.activeMcap +
			(includeStablecoins ? row.stablecoinsOnly.activeMcap + row.stablecoinsAndGovernance.activeMcap : 0),
		onChainMcap:
			row.base.onChainMcap +
			row.governanceOnly.onChainMcap +
			(includeStablecoins ? row.stablecoinsOnly.onChainMcap + row.stablecoinsAndGovernance.onChainMcap : 0),
		defiActiveTvl:
			row.base.defiActiveTvl +
			row.governanceOnly.defiActiveTvl +
			(includeStablecoins ? row.stablecoinsOnly.defiActiveTvl + row.stablecoinsAndGovernance.defiActiveTvl : 0)
	}))
}
