import type { LiteProtocol } from '~/api/types'
import {
	DEXS_API,
	DEX_BASE_API,
	PROTOCOLS_API,
} from '~/constants'
import { IDexResponse, IGetDexsResponseBody } from './types'

export const getDex = async (dexName: string): Promise<IDexResponse> => await fetch(`${DEX_BASE_API}/${dexName}`).then((r) => r.json())

export const getDexs = (): Promise<IGetDexsResponseBody> => fetch(DEXS_API).then((r) => r.json())

// - used in /[dex]
export async function getDexPageData(dex: string) {
	const dexResponse = await fetch(`${DEX_BASE_API}/${dex}`).then((r) => r.json())

	return {
		props: dexResponse
	}
}

// - used in /dexs
export const getDexsPageData = async (aggregateChart: boolean = true) => {
	const {
		dexs,
		totalVolume,
		changeVolume1d,
		changeVolume30d,
		totalDataChart
	} = await fetch(DEXS_API).then((res) => res.json()) as IGetDexsResponseBody

	const getProtocolsRaw = (): Promise<{ protocols: LiteProtocol[] }> => fetch(PROTOCOLS_API).then((r) => r.json())
	const protocolsData = await getProtocolsRaw()

	return {
		props: {
			dexs,
			totalVolume,
			changeVolume1d,
			changeVolume30d,
			totalDataChart:
				aggregateChart
					? totalDataChart
						.map(([timestamp, dexsData]) =>
							[timestamp, Object.values(dexsData).reduce((acc, volume) => acc += volume, 0)])
					: totalDataChart,
			tvlData: protocolsData.protocols.reduce((acc, pd) => {
				acc[pd.name] = pd.tvlPrevDay
				return acc
			}, {})
		}
	}
}