import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { IRawTokenRightsEntry } from './api.types'

export async function fetchTokenRightsData(): Promise<IRawTokenRightsEntry[]> {
	return fetchJson<IRawTokenRightsEntry[]>(`${SERVER_URL}/token-rights`).catch(() => [])
}
