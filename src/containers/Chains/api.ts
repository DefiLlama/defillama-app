import { SERVER_URL, V2_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ChainListItem, ChainsByCategoryResponse, ChainsCategoriesResponse } from './api.types'

const CHAINS_API_URL = `${SERVER_URL}/chains`
const CHAINS_API_V2_URL = `${SERVER_URL}/chains2`
const CHAIN_TVL_API_URL = `${V2_SERVER_URL}/chains`
const CHART_API_URL = `${SERVER_URL}/lite/charts`

export async function fetchChainsList(): Promise<ChainListItem[]> {
	return fetchJson<ChainListItem[]>(CHAINS_API_URL)
}

export async function fetchChainsCategories(): Promise<ChainsCategoriesResponse> {
	return fetchJson<ChainsCategoriesResponse>(CHAINS_API_V2_URL)
}

export async function fetchChainsByCategory<T = ChainsByCategoryResponse>(category: string): Promise<T> {
	return fetchJson<T>(`${CHAINS_API_V2_URL}/${encodeURIComponent(category)}`)
}

export async function fetchChainsByCategoryAll<T = ChainsByCategoryResponse>(): Promise<T> {
	return fetchChainsByCategory('All') as Promise<T>
}

export async function fetchChainsTvlOverview(): Promise<Array<{ name: string; tvl: number }>> {
	return fetchJson<Array<{ name: string; tvl: number }>>(CHAIN_TVL_API_URL)
}

export async function fetchChainChart<T = unknown>(chain?: string): Promise<T> {
	if (!chain || chain === 'All') {
		return fetchJson<T>(CHART_API_URL, { timeout: 2 * 60 * 1000 })
	}

	return fetchJson<T>(`${CHART_API_URL}/${encodeURIComponent(chain)}`, { timeout: 2 * 60 * 1000 })
}
