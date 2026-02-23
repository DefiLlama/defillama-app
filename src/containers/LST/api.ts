import { fetchCoinPrices } from '~/api'
import { YIELD_POOLS_API, YIELDS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ILsdRateApiItem, IYieldPoolApiItem } from './api.types'

/**
 * Fetch yield pools available to the LST dashboard.
 */
export async function fetchYieldPools(): Promise<{ data: IYieldPoolApiItem[] }> {
	return fetchJson<{ data: IYieldPoolApiItem[] }>(YIELD_POOLS_API)
}

/**
 * Fetch LSD rates from the yields API.
 */
export async function fetchLsdRates(): Promise<ILsdRateApiItem[]> {
	return fetchJson<ILsdRateApiItem[]>(`${YIELDS_SERVER_URL}/lsdRates`)
}

/**
 * Fetch the current ETH price in USD.
 */
export async function fetchEthPrice(): Promise<number | null> {
	return fetchCoinPrices(['ethereum:0x0000000000000000000000000000000000000000'])
		.then((data) => data['ethereum:0x0000000000000000000000000000000000000000']?.price ?? null)
		.catch(() => null)
}
