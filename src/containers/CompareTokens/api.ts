import { PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawProtocolsResponse } from './api.types'

/**
 * Fetch the protocol list used for token comparisons.
 */
export async function fetchProtocolsList(): Promise<RawProtocolsResponse> {
	return fetchJson<RawProtocolsResponse>(PROTOCOLS_API)
}
