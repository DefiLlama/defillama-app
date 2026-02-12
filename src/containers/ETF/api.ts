import { fetchJson } from '~/utils/async'
import type { IETFFlowApiItem, IETFSnapshotApiItem } from './api.types'

const ETF_SERVER_URL = process.env.ETF_SERVER_URL ?? 'https://etfs.llama.fi'

export async function fetchETFSnapshot(): Promise<IETFSnapshotApiItem[]> {
	return fetchJson<IETFSnapshotApiItem[]>(`${ETF_SERVER_URL}/snapshot`)
}

export async function fetchETFFlows(): Promise<IETFFlowApiItem[]> {
	return fetchJson<IETFFlowApiItem[]>(`${ETF_SERVER_URL}/flows`)
}
