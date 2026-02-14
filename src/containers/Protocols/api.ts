import { CHART_API, CHAINS_API_V2, PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ChartResponse, ProtocolsResponse } from './api.types'

const FORK_API = `${PROTOCOLS_API.split('/lite')[0]}/forks`
type ExtraTvlChartKey = 'borrowed' | 'staking' | 'pool2'

/** Fetch all protocols from lite/protocols2. */
export async function fetchProtocols(): Promise<ProtocolsResponse> {
	return fetchJson<ProtocolsResponse>(PROTOCOLS_API)
}

/** Fetch chart data (optionally scoped to a chain). */
export async function fetchChartData(chain?: string): Promise<ChartResponse> {
	const url = chain && chain !== 'All' ? `${CHART_API}/${chain}` : CHART_API
	return fetchJson<ChartResponse>(url, { timeout: 2 * 60 * 1000 })
}

/** Fetch chain list with extraTvl info from chains2/All. Returns chain names that have the given extraTvl key. */
export async function fetchChainsWithExtraTvl(extraTvlKey: ExtraTvlChartKey): Promise<string[]> {
	const data = await fetchJson<{
		chainTvls: Array<{ name: string; extraTvl?: Record<string, { tvl: number }> }>
	}>(`${CHAINS_API_V2}/All`)

	return data.chainTvls.flatMap((chain) => (chain.extraTvl?.[extraTvlKey]?.tvl ? [chain.name] : []))
}

/** Fetch fork data. */
export async function fetchForks(): Promise<Record<string, string[]>> {
	const data = await fetchJson<{ forks: Record<string, string[]> }>(FORK_API)
	return data.forks
}

/** Fetch active and historical airdrop config registry. */
export async function fetchAirdropsConfig(): Promise<
	Record<string, { endTime?: number; isActive: boolean; page?: string; name?: string }>
> {
	return fetchJson<Record<string, { endTime?: number; isActive: boolean; page?: string; name?: string }>>(
		'https://airdrops.llama.fi/config'
	)
}
