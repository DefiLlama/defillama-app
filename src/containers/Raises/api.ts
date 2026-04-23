import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawRaise, RawRaisesResponse } from './api.types'

const RAISES_CACHE_TTL_MS = 60_000

let raisesCache: {
	expiresAt: number
	value: Promise<RawRaisesResponse>
} | null = null

/**
 * Fetch fundraising rounds across protocols.
 */
export async function fetchRaisesFromNetwork(): Promise<RawRaisesResponse> {
	return fetchJson<RawRaisesResponse>(`${SERVER_URL}/raises`)
}

export async function fetchRaises(): Promise<RawRaisesResponse> {
	return fetchRaisesFromNetwork()
}

async function fetchRaisesWithShortCache(): Promise<RawRaisesResponse> {
	const now = Date.now()
	if (!raisesCache || raisesCache.expiresAt <= now) {
		const value = fetchRaisesFromNetwork().catch((error) => {
			if (raisesCache?.value === value) {
				raisesCache = null
			}
			throw error
		})

		raisesCache = {
			expiresAt: now + RAISES_CACHE_TTL_MS,
			value
		}
	}

	return raisesCache.value
}

export async function fetchRaisesByDefillamaId(defillamaId: string): Promise<RawRaise[]> {
	if (!defillamaId) {
		return []
	}

	const response = await fetchRaisesWithShortCache()
	return response.raises.filter((raise) => raise.defillamaId === defillamaId)
}
