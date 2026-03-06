import { TRADFI_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { IDATInstitutionsResponse, IDATInstitutionDetailResponse } from './api.types'

/**
 * Fetch all institutions overview data.
 */
export async function fetchDATInstitutions(): Promise<IDATInstitutionsResponse> {
	return fetchJson<IDATInstitutionsResponse>(`${TRADFI_API}/institutions`)
}

/**
 * Fetch detailed data for a single institution by company slug/ticker.
 */
export async function fetchDATInstitutionDetail(company: string): Promise<IDATInstitutionDetailResponse | null> {
	return fetchJson<IDATInstitutionDetailResponse>(`${TRADFI_API}/institutions/${company}`).catch(() => null)
}

/**
 * Normalize a timestamp to milliseconds. If the timestamp looks like unix seconds
 * (< 1e12), convert to ms. Otherwise return as-is.
 */
export function toUnixMsTimestamp(ts: number): number {
	return Number.isFinite(ts) && ts > 0 && ts < 1e12 ? ts * 1e3 : ts
}
