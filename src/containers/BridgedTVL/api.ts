import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	RawBridgeInflowsResponse,
	RawChainAssetsChartResponse,
	RawChainAssetsFlows1dResponse,
	RawChainsAssetsResponse
} from './api.types'

/**
 * Fetch chain-level bridged asset totals.
 */
export async function fetchChainsAssets(): Promise<RawChainsAssetsResponse> {
	return fetchJson<RawChainsAssetsResponse>(`${SERVER_URL}/chain-assets/chains`)
}

/**
 * Fetch 24-hour bridged asset flow totals by chain.
 */
export async function fetchChainAssetsFlows1d(): Promise<RawChainAssetsFlows1dResponse | null> {
	return fetchJson<RawChainAssetsFlows1dResponse>(`${SERVER_URL}/chain-assets/flows/24h`).catch(() => null)
}

/**
 * Fetch historical bridged asset chart data for one chain.
 */
export async function fetchChainAssetsChart(chain: string): Promise<RawChainAssetsChartResponse> {
	return fetchJson<RawChainAssetsChartResponse>(`${SERVER_URL}/chain-assets/chart/${encodeURIComponent(chain)}`)
}

/**
 * Fetch and normalize historical bridged asset flows for one chain.
 */
export async function fetchChainAssetsHistoricalFlows(chainSlug: string): Promise<Array<Record<string, number>>> {
	return fetchJson<RawBridgeInflowsResponse>(`${SERVER_URL}/chain-assets/historical-flows/${chainSlug}/1d`)
		.then((data) => data.data.map((item) => ({ ...item.data, date: item.timestamp })))
		.catch(() => [])
}
