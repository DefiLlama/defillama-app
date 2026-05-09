import { SERVER_URL } from '~/constants'
import { fetchJson, getSlowJsonTimeoutMs } from '~/utils/async'
import type { RawEntitiesResponse, RawTreasuriesResponse } from './api.types'

/**
 * Fetch treasury records for supported entities.
 */
export async function fetchTreasuriesFromNetwork(): Promise<RawTreasuriesResponse> {
	return fetchJson<RawTreasuriesResponse>(`${SERVER_URL}/treasuries`, { timeout: getSlowJsonTimeoutMs() })
}

export async function fetchTreasuries(): Promise<RawTreasuriesResponse> {
	return fetchTreasuriesFromNetwork()
}

export async function fetchTreasuryById(treasuryId: string): Promise<RawTreasuriesResponse[number] | null> {
	if (!treasuryId) {
		return null
	}

	const data = await fetchTreasuriesFromNetwork()
	for (const treasury of data) {
		if (treasury.id === treasuryId) {
			return treasury
		}
	}
	return null
}

/**
 * Fetch entity metadata used by the treasuries page.
 */
export async function fetchEntities(): Promise<RawEntitiesResponse> {
	return fetchJson<RawEntitiesResponse>(`${SERVER_URL}/entities`)
}
