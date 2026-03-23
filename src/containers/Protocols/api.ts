import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ProtocolsResponse } from './api.types'

const PROTOCOLS_LITE_API_URL = `${SERVER_URL}/lite/protocols2?b=2`

/** Fetch all protocols from lite/protocols2. */
export async function fetchProtocols(): Promise<ProtocolsResponse> {
	return fetchJson<ProtocolsResponse>(PROTOCOLS_LITE_API_URL)
}

/** Fetch active and historical airdrop config registry. */
export async function fetchAirdropsConfig(): Promise<
	Record<string, { endTime?: number; isActive: boolean; page?: string; name?: string }>
> {
	return fetchJson<Record<string, { endTime?: number; isActive: boolean; page?: string; name?: string }>>(
		'https://airdrops.llama.fi/config'
	)
}
