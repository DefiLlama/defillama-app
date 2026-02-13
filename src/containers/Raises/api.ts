import { RAISES_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawRaisesResponse } from './api.types'

export async function fetchRaises(): Promise<RawRaisesResponse> {
	return fetchJson<RawRaisesResponse>(RAISES_API)
}
