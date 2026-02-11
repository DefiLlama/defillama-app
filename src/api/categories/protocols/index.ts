import { PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { type BasicPropsToKeep, formatProtocolsData } from './utils'

// - used in /airdrops, /protocols, /recent, /top-gainers-and-losers, /top-protocols, /watchlist
export async function getSimpleProtocolsPageData(propsToKeep?: BasicPropsToKeep) {
	const { protocols, chains, parentProtocols } = await fetchJson(PROTOCOLS_API)

	const filteredProtocols = formatProtocolsData({
		protocols,
		protocolProps: propsToKeep
	})

	return { protocols: filteredProtocols, chains, parentProtocols }
}

export async function getAirdropDirectoryData() {
	const airdrops = await fetchJson('https://airdrops.llama.fi/config')

	const now = Date.now()
	const result: Array<{ endTime?: number; isActive: boolean; page?: string }> = []
	for (const key in airdrops) {
		const i = airdrops[key] as { endTime?: number; isActive: boolean; page?: string }
		if (i.isActive === false || !i.page) continue
		if (!i.endTime || (i.endTime < 1e12 ? i.endTime * 1000 > now : i.endTime > now)) {
			result.push(i)
		}
	}
	return result
}
