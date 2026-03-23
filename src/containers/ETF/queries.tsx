import { fetchETFFlows, fetchETFSnapshot } from './api'
import type { AssetTotals, ETFOverviewProps, IETFSnapshotRow, IProcessedFlows } from './types'

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function getETFData(): Promise<ETFOverviewProps> {
	const [snapshot, flows] = await Promise.all([fetchETFSnapshot(), fetchETFFlows().catch(() => [])])

	const maxDate = flows.length > 0 ? Math.max(...flows.map((item) => new Date(item.day).getTime())) : null

	const lastUpdated =
		maxDate == null
			? 'N/A'
			: new Date(maxDate).toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric',
					timeZone: 'UTC'
				})

	const processedSnapshot: IETFSnapshotRow[] = snapshot
		.map((i) => ({
			...i,
			chain: [capitalize(i.asset)]
		}))
		.sort((a, b) => b.flows - a.flows)

	const processedFlows: IProcessedFlows = {}
	for (const { gecko_id, day, total_flow_usd } of flows) {
		const timestamp = Math.floor(new Date(day).getTime() / 1000 / 86400) * 86400
		processedFlows[timestamp] = {
			...processedFlows[timestamp],
			date: timestamp,
			[capitalize(gecko_id)]: total_flow_usd
		}
	}

	const totalsByAsset: AssetTotals = {}
	for (const item of processedSnapshot) {
		const key = item.asset.toLowerCase()
		totalsByAsset[key] = {
			aum: (totalsByAsset[key]?.aum ?? 0) + item.aum,
			flows: (totalsByAsset[key]?.flows ?? 0) + item.flows
		}
	}

	return {
		snapshot: processedSnapshot,
		flows: processedFlows,
		totalsByAsset,
		lastUpdated
	}
}
