import { CEXS_API, INFLOWS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawCexsResponse } from './api.types'

export async function fetchCexs(): Promise<RawCexsResponse> {
	return fetchJson<RawCexsResponse>(CEXS_API)
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
