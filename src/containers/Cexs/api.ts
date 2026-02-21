import { fetchJson } from '~/utils/async'
import type { RawCexInflowsResponse, RawCexsResponse } from './api.types'

const API_KEY = process.env.API_KEY
const SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/api` : 'https://api.llama.fi'
const INFLOWS_API_URL = `${SERVER_URL}/inflows`
const CEXS_API_URL = `${SERVER_URL}/cexs`

/**
 * Fetch centralized exchange summary data.
 */
export async function fetchCexs(): Promise<RawCexsResponse> {
	return fetchJson<RawCexsResponse>(CEXS_API_URL)
}

/**
 * Fetch inflow and outflow data for a single exchange.
 */
export async function fetchCexInflows(
	cexSlug: string,
	startTime: number,
	endTime: number,
	tokensToExclude: string
): Promise<RawCexInflowsResponse> {
	return fetchJson<RawCexInflowsResponse>(
		`${INFLOWS_API_URL}/${cexSlug}/${startTime}?end=${endTime}&tokensToExclude=${tokensToExclude}`
	)
}
