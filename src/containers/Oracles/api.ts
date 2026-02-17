import { V2_SERVER_URL } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type {
	IOracleMetrics,
	IOracleChart,
	IOracleProtocolBreakdownChart,
	IOracleChainBreakdownChart,
	IOracleChainChart,
	IOracleProtocolChart,
	IOracleProtocolChainBreakdownChart,
	IOracleChainProtocolBreakdownChart
} from './api.types'

function appendKeyParam(url: string, key?: string): string {
	if (!key) return url
	return `${url}?key=${encodeURIComponent(key)}`
}

/**
 * Fetch oracle metrics.
 */
export async function fetchOracleMetrics(): Promise<IOracleMetrics> {
	return fetchJson<IOracleMetrics>(`${V2_SERVER_URL}/metrics/oracle`, { timeout: 30_000 })
}

/**
 * Fetch oracle total chart data.
 */
export async function fetchOracleChart({
	key
}: {
	key?: string
} = {}): Promise<IOracleChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/oracle`, key)
	return fetchJson<IOracleChart>(url, { timeout: 30_000 })
}

/**
 * Fetch oracle protocol breakdown chart data.
 */
export async function fetchOracleProtocolBreakdownChart({
	key
}: {
	key?: string
} = {}): Promise<IOracleProtocolBreakdownChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/oracle/protocol-breakdown`, key)
	return fetchJson<IOracleProtocolBreakdownChart>(url, { timeout: 30_000 })
}

/**
 * Fetch oracle chain breakdown chart data.
 */
export async function fetchOracleChainBreakdownChart({
	key
}: {
	key?: string
} = {}): Promise<IOracleChainBreakdownChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/oracle/chain-breakdown`, key)
	return fetchJson<IOracleChainBreakdownChart>(url, { timeout: 30_000 })
}

/**
 * Fetch oracle chart data for a specific protocol.
 */
export async function fetchOracleProtocolChart({
	protocol,
	key
}: {
	protocol: string
	key?: string
}): Promise<IOracleProtocolChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/oracle/protocol/${slug(protocol)}`, key)
	return fetchJson<IOracleProtocolChart>(url, { timeout: 30_000 })
}

/**
 * Fetch oracle chart data for a specific chain.
 */
export async function fetchOracleChainChart({
	chain,
	key
}: {
	chain: string
	key?: string
}): Promise<IOracleChainChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/oracle/chain/${slug(chain)}`, key)
	return fetchJson<IOracleChainChart>(url, { timeout: 30_000 })
}

/**
 * Fetch oracle protocol chain breakdown chart data.
 */
export async function fetchOracleProtocolChainBreakdownChart({
	protocol,
	key
}: {
	protocol: string
	key?: string
}): Promise<IOracleProtocolChainBreakdownChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/oracle/protocol/${slug(protocol)}/chain-breakdown`, key)
	return fetchJson<IOracleProtocolChainBreakdownChart>(url, { timeout: 30_000 })
}

/**
 * Fetch oracle chain protocol breakdown chart data.
 */
export async function fetchOracleChainProtocolBreakdownChart({
	chain,
	key
}: {
	chain: string
	key?: string
}): Promise<IOracleChainProtocolBreakdownChart> {
	const url = appendKeyParam(`${V2_SERVER_URL}/chart/oracle/chain/${slug(chain)}/protocol-breakdown`, key)
	return fetchJson<IOracleChainProtocolBreakdownChart>(url, { timeout: 30_000 })
}
