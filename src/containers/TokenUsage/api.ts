import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawProtocolTokenUsageEntry } from './api.types'

const PROTOCOLS_BY_TOKEN_API_URL = `${SERVER_URL}/tokenProtocols`

export async function fetchProtocolsByToken(symbol: string): Promise<RawProtocolTokenUsageEntry[]> {
	if (!symbol) return []
	return fetchJson<RawProtocolTokenUsageEntry[]>(`${PROTOCOLS_BY_TOKEN_API_URL}/${symbol.toUpperCase()}`)
}

export async function fetchProtocolsByTokenClient(symbol: string): Promise<RawProtocolTokenUsageEntry[]> {
	if (!symbol) return []
	const res = await fetch(`/api/token-usage/${encodeURIComponent(symbol.toUpperCase())}`)
	if (!res.ok) {
		throw new Error(`Failed to fetch token protocols: ${res.status}`)
	}
	return res.json()
}
