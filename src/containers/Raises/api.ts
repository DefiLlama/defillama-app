import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawRaisesResponse } from './api.types'

/**
 * Fetch fundraising rounds across protocols.
 */
export async function fetchRaises(): Promise<RawRaisesResponse> {
	return fetchJson<RawRaisesResponse>(`${SERVER_URL}/raises`)
}
