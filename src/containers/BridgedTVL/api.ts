import { BRIDGEINFLOWS_API, CHAINS_ASSETS, CHAIN_ASSETS_FLOWS } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawBridgeInflowsResponse, RawChainAssetsFlows1dResponse, RawChainsAssetsResponse } from './api.types'

export async function fetchChainsAssets(): Promise<RawChainsAssetsResponse> {
	return fetchJson<RawChainsAssetsResponse>(CHAINS_ASSETS)
}

export async function fetchChainAssetsFlows1d(): Promise<RawChainAssetsFlows1dResponse | null> {
	return fetchJson<RawChainAssetsFlows1dResponse>(`${CHAIN_ASSETS_FLOWS}/24h`).catch(() => null)
}

export async function fetchBridgeInflows(chainSlug: string): Promise<Array<Record<string, number>>> {
	return fetchJson<RawBridgeInflowsResponse>(`${BRIDGEINFLOWS_API}/${chainSlug}/1d`)
		.then((data) => data.data.map((item) => ({ ...item.data, date: item.timestamp })))
		.catch(() => [])
}
