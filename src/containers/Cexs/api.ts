import { INFLOWS_API, SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawCexsResponse } from './api.types'

export async function fetchCexs(): Promise<RawCexsResponse> {
	return fetchJson<RawCexsResponse>(`${SERVER_URL}/cexs`)
}

export async function fetchCexInflows(
	cexSlug: string,
	startTime: number,
	endTime: number,
	tokensToExclude: string
): Promise<{ outflows?: number }> {
	return fetchJson<{ outflows?: number }>(
		`${INFLOWS_API}/${cexSlug}/${startTime}?end=${endTime}&tokensToExclude=${tokensToExclude}`
	)
}
