import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { IHackApiItem } from './api.types'

export async function fetchHacks(): Promise<IHackApiItem[]> {
	return fetchJson<IHackApiItem[]>(`${SERVER_URL}/hacks`)
}
