import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawEntitiesResponse, RawTreasuriesResponse } from './api.types'

export async function fetchTreasuries(): Promise<RawTreasuriesResponse> {
	return fetchJson<RawTreasuriesResponse>(`${SERVER_URL}/treasuries`)
}

export async function fetchEntities(): Promise<RawEntitiesResponse> {
	return fetchJson<RawEntitiesResponse>(`${SERVER_URL}/entities`)
}
