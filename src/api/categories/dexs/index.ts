import type { LiteProtocol } from '~/api/types'
import {
	DEXS_API,
	DEX_BASE_API,
	PROTOCOLS_API,
} from '~/constants'
import { IDexResponse, IGetDexsResponseBody } from './types'
import { formatChain } from './utils'

export const getDex = async (dexName: string): Promise<IDexResponse> => await fetch(`${DEX_BASE_API}/${dexName}`).then((r) => r.json())

export const getDexs = (): Promise<IGetDexsResponseBody> => fetch(DEXS_API).then((r) => r.json())

// - used in /[dex]
export async function getDexPageData(dex: string) {
	const dexResponse = await fetch(`${DEX_BASE_API}/${dex}`).then((r) => r.json())

	return {
		props: dexResponse
	}
}

// - used in /dexs and /dexs/[chain]
export const getChainPageData = async (chain?: string) => {
	const API = chain ? `${DEXS_API}/${chain}` : DEXS_API
	const {
		dexs,
		totalVolume,
		changeVolume1d,
		changeVolume30d,
		totalDataChart,
		totalDataChartBreakdown,
		allChains
	} = await fetch(API).then((res) => res.json()) as IGetDexsResponseBody

	const getProtocolsRaw = (): Promise<{ protocols: LiteProtocol[] }> => fetch(PROTOCOLS_API).then((r) => r.json())
	const protocolsData = await getProtocolsRaw()

	return {
		props: {
			dexs,
			totalVolume,
			changeVolume1d,
			changeVolume30d,
			totalDataChart: totalDataChart,
			chain: chain ? formatChain(chain) : "All",
			tvlData: protocolsData.protocols.reduce((acc, pd) => {
				acc[pd.name] = pd.tvlPrevDay
				return acc
			}, {}),
			totalDataChartBreakdown,
			allChains
		}
	}
}