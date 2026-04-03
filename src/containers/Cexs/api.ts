import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawCexInflowsResponse, RawCexsResponse } from './api.types'

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
