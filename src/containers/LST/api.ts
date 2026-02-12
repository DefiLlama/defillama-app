import { COINS_PRICES_API, PROTOCOL_API, PROTOCOLS_API, YIELD_POOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	ICoinPriceApiResponse,
	ILiteProtocolApiItem,
	ILsdRateApiItem,
	IProtocolDetailApiItem,
	IYieldPoolApiItem
} from './api.types'

const YIELDS_SERVER_URL = process.env.YIELDS_SERVER_URL ?? 'https://yields.llama.fi'
const LSD_RATES_API = `${YIELDS_SERVER_URL}/lsdRates`

export async function fetchProtocols(): Promise<{ protocols: ILiteProtocolApiItem[] }> {
	return fetchJson<{ protocols: ILiteProtocolApiItem[] }>(PROTOCOLS_API)
}

export async function fetchYieldPools(): Promise<{ data: IYieldPoolApiItem[] }> {
	return fetchJson<{ data: IYieldPoolApiItem[] }>(YIELD_POOLS_API)
}

export async function fetchLsdRates(): Promise<ILsdRateApiItem[]> {
	return fetchJson<ILsdRateApiItem[]>(LSD_RATES_API)
}

export async function fetchEthPrice(): Promise<number | null> {
	return fetchJson<ICoinPriceApiResponse>(
		`${COINS_PRICES_API}/current/ethereum:0x0000000000000000000000000000000000000000`
	)
		.then((data) => data.coins['ethereum:0x0000000000000000000000000000000000000000']?.price ?? null)
		.catch(() => null)
}

export async function fetchProtocolDetail(protocolSlug: string): Promise<IProtocolDetailApiItem> {
	return fetchJson<IProtocolDetailApiItem>(`${PROTOCOL_API}/${protocolSlug}`)
}
