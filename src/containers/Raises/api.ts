import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawRaise, RawRaisesResponse } from './api.types'

/**
 * Fetch fundraising rounds across protocols.
 */
export async function fetchRaisesFromNetwork(): Promise<RawRaisesResponse> {
	return fetchJson<RawRaisesResponse>(`${SERVER_URL}/raises`)
}

export async function fetchRaises(): Promise<RawRaisesResponse> {
	return fetchRaisesFromNetwork()
}

export async function fetchRaisesByDefillamaId(defillamaId: string): Promise<RawRaise[]> {
	if (!defillamaId) {
		return []
	}

	const response = await fetchRaisesFromNetwork()
	const rows = []
	for (const raise of response.raises) {
		if (raise.defillamaId === defillamaId) {
			rows.push(raise)
		}
	}
	return rows
}
