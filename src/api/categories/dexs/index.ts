import type { LiteProtocol } from '~/api/types'
import { DEXS_API, DEX_BASE_API, PROTOCOLS_API } from '~/constants'
import { chainIconUrl } from '~/utils'
import { IDexResponse, IGetDexsResponseBody } from './types'
import { formatChain } from './utils'

export const getDex = async (dexName: string): Promise<IDexResponse> =>
	await fetch(`${DEX_BASE_API}/${dexName}`).then((r) => r.json())

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
	const { dexs, totalVolume, changeVolume1d, changeVolume30d, totalDataChart, totalDataChartBreakdown, allChains } =
		(await fetch(API).then((res) => res.json())) as IGetDexsResponseBody

	const getProtocolsRaw = (): Promise<{ protocols: LiteProtocol[] }> => fetch(PROTOCOLS_API).then((r) => r.json())
	const protocolsData = await getProtocolsRaw()
	const tvlData = protocolsData.protocols.reduce((acc, pd) => {
		acc[pd.name] = pd.tvlPrevDay
		return acc
	}, {})

	const dexsWithSubrows = dexs.map((dex) => ({
		...dex,
		volumetvl: dex.totalVolume24h / tvlData[dex.name],
		dominance: (100 * dex.totalVolume24h) / totalVolume,
		chains: dex.chains.map(formatChain),
		subRows: dex.protocolVersions
			? Object.entries(dex.protocolVersions)
					.map(([versionName, summary]) => ({
						...dex,
						name: `${dex.name} - ${versionName.toUpperCase()}`,
						displayName: `${dex.name} - ${versionName.toUpperCase()}`,
						...summary
					}))
					.sort((first, second) => 0 - (first.totalVolume24h > second.totalVolume24h ? 1 : -1))
			: null
	}))

	return {
		props: {
			dexs: dexsWithSubrows,
			totalVolume,
			changeVolume1d,
			changeVolume30d,
			totalDataChart: totalDataChart,
			chain: chain ? formatChain(chain) : 'All',
			tvlData,
			totalDataChartBreakdown,
			allChains
		}
	}
}

// - used in /dexs/chains
export const getVolumesByChain = async () => {
	const { allChains } = (await fetch(DEXS_API).then((res) => res.json())) as IGetDexsResponseBody

	const volumesByChain = await Promise.all(allChains.map((chain) => getChainPageData(chain)))

	const tableData = volumesByChain.map(({ props: { totalVolume, changeVolume1d, changeVolume30d, chain } }) => ({
		name: chain,
		logo: chainIconUrl(chain),
		totalVolume,
		changeVolume1d,
		changeVolume30d
	}))

	return {
		props: {
			data: tableData
		}
	}
}
