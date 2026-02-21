import { COINS_PRICES_API, PROTOCOLS_API, YIELD_POOLS_API, YIELDS_SERVER_URL } from '~/constants'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { fetchJson } from '~/utils/async'
import type {
	ICoinPriceApiResponse,
	ILiteProtocolApiItem,
	ILsdRateApiItem,
	IProtocolDetailApiItem,
	IYieldPoolApiItem
} from './api.types'

/**
 * Fetch protocols used by the LST dashboard.
 */
export async function fetchProtocols(): Promise<{ protocols: ILiteProtocolApiItem[] }> {
	return fetchJson<{ protocols: ILiteProtocolApiItem[] }>(PROTOCOLS_API)
}

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
	return fetchJson<ICoinPriceApiResponse>(
		`${COINS_PRICES_API}/current/ethereum:0x0000000000000000000000000000000000000000`
	)
		.then((data) => data.coins['ethereum:0x0000000000000000000000000000000000000000']?.price ?? null)
		.catch(() => null)
}

/**
 * Fetch protocol details for a selected LST protocol slug.
 */
export async function fetchProtocolDetail(protocolSlug: string): Promise<IProtocolDetailApiItem> {
	return fetchProtocolBySlug<IProtocolDetailApiItem>(protocolSlug)
}
