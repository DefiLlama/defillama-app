import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawEntitiesResponse, RawTreasuriesResponse } from './api.types'

/**
 * Fetch treasury records for supported entities.
 */
export async function fetchTreasuries(): Promise<RawTreasuriesResponse> {
	return fetchJson<RawTreasuriesResponse>(`${SERVER_URL}/treasuries`)
}

/**
 * Fetch entity metadata used by the treasuries page.
 */
export async function fetchEntities(): Promise<RawEntitiesResponse> {
	return fetchJson<RawEntitiesResponse>(`${SERVER_URL}/entities`)
}
