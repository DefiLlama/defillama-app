import { PROTOCOLS_API } from '~/constants'
import { fetchChainChart, fetchChainsByCategoryAll } from '~/containers/Chains/api'
import { fetchJson } from '~/utils/async'
import type { ChartResponse, ExtraTvlChartKey, ProtocolsResponse } from './api.types'

/** Fetch all protocols from lite/protocols2. */
export async function fetchProtocols(): Promise<ProtocolsResponse> {
	return fetchJson<ProtocolsResponse>(PROTOCOLS_API)
}

/** Fetch chart data (optionally scoped to a chain). */
export async function fetchChartData(chain?: string): Promise<ChartResponse> {
	return fetchChainChart<ChartResponse>(chain)
}

/** Fetch chain list with extraTvl info from chains2/All. Returns chain names that have the given extraTvl key. */
export async function fetchChainsWithExtraTvl(extraTvlKey: ExtraTvlChartKey): Promise<string[]> {
	const data = await fetchChainsByCategoryAll<{
		chainTvls: Array<{ name: string; extraTvl?: Record<string, { tvl: number }> }>
	}>()

	return data.chainTvls.flatMap((chain) => (chain.extraTvl?.[extraTvlKey]?.tvl ? [chain.name] : []))
}

/** Fetch active and historical airdrop config registry. */
export async function fetchAirdropsConfig(): Promise<
	Record<string, { endTime?: number; isActive: boolean; page?: string; name?: string }>
> {
	return fetchJson<Record<string, { endTime?: number; isActive: boolean; page?: string; name?: string }>>(
		'https://airdrops.llama.fi/config'
	)
}
