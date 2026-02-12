import { ETF_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { IETFFlowApiItem, IETFSnapshotApiItem } from './api.types'

export async function fetchETFSnapshot(): Promise<IETFSnapshotApiItem[]> {
	return fetchJson<IETFSnapshotApiItem[]>(`${ETF_SERVER_URL}/snapshot`)
}

export async function fetchETFFlows(): Promise<IETFFlowApiItem[]> {
	return fetchJson<IETFFlowApiItem[]>(`${ETF_SERVER_URL}/flows`)
}
