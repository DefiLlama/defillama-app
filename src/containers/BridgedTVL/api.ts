import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	RawBridgeInflowsResponse,
	RawChainAssetsChartResponse,
	RawChainAssetsFlows1dResponse,
	RawChainsAssetsResponse
} from './api.types'

export async function fetchChainsAssets(): Promise<RawChainsAssetsResponse> {
	return fetchJson<RawChainsAssetsResponse>(`${SERVER_URL}/chain-assets/chains`)
}

export async function fetchChainAssetsFlows1d(): Promise<RawChainAssetsFlows1dResponse | null> {
	return fetchJson<RawChainAssetsFlows1dResponse>(`${SERVER_URL}/chain-assets/flows/24h`).catch(() => null)
}

export async function fetchChainAssetsChart(chain: string): Promise<RawChainAssetsChartResponse> {
	return fetchJson<RawChainAssetsChartResponse>(`${SERVER_URL}/chain-assets/chart/${encodeURIComponent(chain)}`)
}

export async function fetchChainAssetsHistoricalFlows(chainSlug: string): Promise<Array<Record<string, number>>> {
	return fetchJson<RawBridgeInflowsResponse>(`${SERVER_URL}/chain-assets/historical-flows/${chainSlug}/1d`)
		.then((data) => data.data.map((item) => ({ ...item.data, date: item.timestamp })))
		.catch(() => [])
}
