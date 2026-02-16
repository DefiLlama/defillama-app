import { V2_SERVER_URL } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type {
	IOracleMetrics,
	IOracleProtocolBreakdownChart,
	IOracleChainBreakdownChart,
	IOracleProtocolChart,
	IOracleProtocolChainBreakdownChart,
	IOracleChainProtocolBreakdownChart
} from './api.types'

/**
 * Fetch oracle metrics.
 */
export async function fetchOracleMetrics(): Promise<IOracleMetrics> {
	return fetchJson<IOracleMetrics>(`${V2_SERVER_URL}/metrics/oracle`, { timeout: 30_000 })
}

/**
 * Fetch oracle protocol breakdown chart data.
 */
export async function fetchOracleProtocolBreakdownChart(): Promise<IOracleProtocolBreakdownChart> {
	return fetchJson<IOracleProtocolBreakdownChart>(`${V2_SERVER_URL}/chart/oracle/protocol-breakdown`, { timeout: 30_000 })
}

/**
 * Fetch oracle chain breakdown chart data.
 */
export async function fetchOracleChainBreakdownChart(): Promise<IOracleChainBreakdownChart> {
	return fetchJson<IOracleChainBreakdownChart>(`${V2_SERVER_URL}/chart/oracle/chain-breakdown`, { timeout: 30_000 })
}

/**
 * Fetch oracle chart data for a specific protocol.
 */
export async function fetchOracleProtocolChart({
	protocol
}: {
	protocol: string
}): Promise<IOracleProtocolChart> {
	const url = `${V2_SERVER_URL}/chart/oracle/protocol/${slug(protocol)}`
	return fetchJson<IOracleProtocolChart>(url, { timeout: 30_000 })
}

/**
 * Fetch oracle protocol chain breakdown chart data.
 */
export async function fetchOracleProtocolChainBreakdownChart({
	protocol
}: {
	protocol: string
}): Promise<IOracleProtocolChainBreakdownChart> {
	const url = `${V2_SERVER_URL}/chart/oracle/protocol/${slug(protocol)}/chain-breakdown`
	return fetchJson<IOracleProtocolChainBreakdownChart>(url, { timeout: 30_000 })
}

/**
 * Fetch oracle chain protocol breakdown chart data.
 */
export async function fetchOracleChainProtocolBreakdownChart({
	chain
}: {
	chain: string
}): Promise<IOracleChainProtocolBreakdownChart> {
	const url = `${V2_SERVER_URL}/chart/oracle/chain/${slug(chain)}/protocol-breakdown`
	return fetchJson<IOracleChainProtocolBreakdownChart>(url, { timeout: 30_000 })
}
