import { MARKETS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ExchangeMarketsListResponse, ExchangeMarketsResponse, TokenMarketsListResponse } from '../api.types'

export async function fetchTokenMarketsListFromNetwork(): Promise<TokenMarketsListResponse> {
	return fetchJson<TokenMarketsListResponse>(`${MARKETS_SERVER_URL}/tokens/list.json`)
}

export async function fetchExchangeMarketsListFromNetwork(): Promise<ExchangeMarketsListResponse> {
	return fetchJson<ExchangeMarketsListResponse>(`${MARKETS_SERVER_URL}/exchanges/list.json`)
}

export async function fetchExchangeMarketsFromNetwork(exchange: string): Promise<ExchangeMarketsResponse> {
	return fetchJson<ExchangeMarketsResponse>(
		`${MARKETS_SERVER_URL}/exchanges/${encodeURIComponent(exchange.toLowerCase())}/index.json`
	)
}
