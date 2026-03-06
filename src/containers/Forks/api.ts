import { V2_SERVER_URL } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type { IForkMetrics, IForkProtocolBreakdownChart, IForkProtocolChart } from './api.types'

function appendKeyParam(url: string, key?: string): string {
	if (!key) return url
	const separator = url.includes('?') ? '&' : '?'
	return `${url}${separator}key=${encodeURIComponent(key)}`
}

/**
 * Fetch fork metrics.
 */
export async function fetchForkMetrics(): Promise<IForkMetrics> {
	return fetchJson<IForkMetrics>(`${V2_SERVER_URL}/metrics/fork`, { timeout: 30_000 })
}

/**
 * Fetch fork protocol breakdown chart data.
 */
export async function fetchForkProtocolBreakdownChart({
	key
}: {
	key?: string
} = {}): Promise<IForkProtocolBreakdownChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/fork/protocol-breakdown`, key)
	return fetchJson<IForkProtocolBreakdownChart>(url, { timeout: 30_000 })
}

/**
 * Fetch fork chart data for a specific protocol.
 */
export async function fetchForkProtocolChart({
	protocol,
	key
}: {
	protocol: string
	key?: string
}): Promise<IForkProtocolChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/fork/protocol/${slug(protocol)}`, key)
	return fetchJson<IForkProtocolChart>(url, { timeout: 30_000 })
}
