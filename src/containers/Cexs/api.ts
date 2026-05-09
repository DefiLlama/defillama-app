import { MARKETS_SERVER_URL, SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawCexInflowsResponse, RawCexsResponse } from './api.types'
import type { ExchangeMarketsListResponse, ExchangeMarketsResponse } from './markets.types'

const INFLOWS_API_URL = `${SERVER_URL}/inflows`
const CEXS_API_URL = `${SERVER_URL}/cexs`

/**
 * Fetch centralized exchange summary data.
 */
export async function fetchCexs(): Promise<RawCexsResponse> {
	return fetchJson<RawCexsResponse>(CEXS_API_URL)
}

/**
 * Fetch inflow/outflow data server-side (direct upstream call, uses API_KEY from env).
 */
export async function fetchCexInflows(
	cexSlug: string,
	startTime: number,
	endTime: number,
	tokensToExclude: string
): Promise<RawCexInflowsResponse> {
	return fetchJson<RawCexInflowsResponse>(
		`${INFLOWS_API_URL}/${encodeURIComponent(cexSlug)}/${startTime}?end=${endTime}&tokensToExclude=${encodeURIComponent(tokensToExclude)}`
	)
}

/**
 * Fetch inflow/outflow data client-side via the authenticated proxy route.
 */
export async function fetchCexInflowsProxy(
	cexSlug: string,
	startTime: number,
	endTime: number,
	tokensToExclude: string,
	authorizedFetch: (url: string) => Promise<Response | null>
): Promise<RawCexInflowsResponse> {
	const url = `/api/cex/inflows?slug=${encodeURIComponent(cexSlug)}&start=${startTime}&end=${endTime}&tokensToExclude=${encodeURIComponent(tokensToExclude)}`
	const res = await authorizedFetch(url)
	if (!res || !res.ok) {
		throw new Error(`Inflows API returned ${res?.status ?? 'no response'}`)
	}
	return res.json()
}

export async function fetchCexInflowsBatchProxy(
	cexs: Array<{ slug: string; tokensToExclude: string }>,
	startTime: number,
	endTime: number,
	authorizedFetch: (url: string, options?: RequestInit) => Promise<Response | null>
): Promise<Record<string, RawCexInflowsResponse>> {
	const res = await authorizedFetch('/api/cex/inflows/batch', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cexs, start: startTime, end: endTime })
	})
	if (res && (res.status === 404 || res.status === 405)) {
		const entries = await Promise.all(
			cexs.map(async (cex) => {
				try {
					const inflows = await fetchCexInflowsProxy(cex.slug, startTime, endTime, cex.tokensToExclude, authorizedFetch)
					return [cex.slug, inflows] as const
				} catch {
					return null
				}
			})
		)
		return Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null))
	}
	if (!res || !res.ok) {
		throw new Error(`Inflows batch API returned ${res?.status ?? 'no response'}`)
	}
	return res.json()
}

export async function fetchExchangeMarketsListFromNetwork(): Promise<ExchangeMarketsListResponse> {
	return fetchJson<ExchangeMarketsListResponse>(`${MARKETS_SERVER_URL}/exchanges/list.json`)
}

export async function fetchExchangeMarketsFromNetwork(exchange: string): Promise<ExchangeMarketsResponse> {
	return fetchJson<ExchangeMarketsResponse>(
		`${MARKETS_SERVER_URL}/exchanges/${encodeURIComponent(exchange.toLowerCase())}/index.json`
	)
}

export async function fetchExchangeMarkets(exchange: string): Promise<ExchangeMarketsResponse> {
	return fetchJson<ExchangeMarketsResponse>(`/api/markets/exchanges/${encodeURIComponent(exchange.toLowerCase())}`)
}
