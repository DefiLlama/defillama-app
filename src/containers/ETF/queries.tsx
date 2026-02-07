import { ETF_FLOWS_API, ETF_SNAPSHOT_API } from '~/constants'
import { fetchJson } from '~/utils/async'

interface AssetTotals {
	[key: string]: {
		aum: number
		flows: number
	}
}

export async function getETFData() {
	const [snapshot, flows] = await Promise.all([ETF_SNAPSHOT_API, ETF_FLOWS_API].map((url) => fetchJson(url)))

	const maxDate = Math.max(...flows.map((item) => new Date(item.day).getTime()))

	const formattedDate = new Date(maxDate).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	})

	const processedSnapshot = snapshot
		.map((i) => ({
			...i,
			chain: [i.asset.charAt(0).toUpperCase() + i.asset.slice(1)]
		}))
		.sort((a, b) => b.flows - a.flows)

	const processedFlows = flows.reduce((acc, { gecko_id, day, total_flow_usd }) => {
		const timestamp = Math.floor(new Date(day).getTime() / 1000 / 86400) * 86400
		acc[timestamp] = {
			date: timestamp,
			...acc[timestamp],
			[gecko_id.charAt(0).toUpperCase() + gecko_id.slice(1)]: total_flow_usd
		}
		return acc
	}, {})

	const totalsByAsset = processedSnapshot.reduce((acc: AssetTotals, item) => {
		acc[item.asset.toLowerCase()] = {
			aum: (acc[item.asset.toLowerCase()]?.aum || 0) + item.aum,
			flows: (acc[item.asset.toLowerCase()]?.flows || 0) + item.flows
		}
		return acc
	}, {})

	return {
		snapshot: processedSnapshot,
		flows: processedFlows,
		totalsByAsset,
		lastUpdated: formattedDate
	}
}
