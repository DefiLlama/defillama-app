import { BRIDGES_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	BridgeNetflowPeriod,
	RawBridgeDayStatsResponse,
	RawBridgeLargeTransactionsResponse,
	RawBridgesResponse,
	RawBridgeTxCountsResponse,
	RawBridgeTransactionsResponse,
	RawBridgeVolumeBySlugResponse,
	RawBridgeVolumeResponse,
	RawBridgeNetflowsResponse
} from './api.types'

const BRIDGEDAYSTATS_API = `${BRIDGES_SERVER_URL}/bridgedaystats`
const BRIDGES_API = `${BRIDGES_SERVER_URL}/bridges`
const BRIDGELARGETX_API = `${BRIDGES_SERVER_URL}/largetransactions`
const BRIDGETXCOUNT_API = `${BRIDGES_SERVER_URL}/bridgetxcounts`
const BRIDGETX_API = `${BRIDGES_SERVER_URL}/transactions`
const BRIDGEVOLUME_API = `${BRIDGES_SERVER_URL}/bridgevolume`
const BRIDGEVOLUME_API_SLUG = `${BRIDGES_SERVER_URL}/bridgevolume/slug`
const NETFLOWS_API = `${BRIDGES_SERVER_URL}/netflows`

interface BridgeApiErrorEnvelope {
	statusCode: number
	body: string
	headers?: Record<string, string>
}

const isBridgeApiErrorEnvelope = (value: unknown): value is BridgeApiErrorEnvelope => {
	return (
		typeof value === 'object' &&
		value !== null &&
		'statusCode' in value &&
		'body' in value &&
		typeof (value as { statusCode?: unknown }).statusCode === 'number' &&
		typeof (value as { body?: unknown }).body === 'string'
	)
}

const extractEnvelopeMessage = (envelope: BridgeApiErrorEnvelope): string => {
	try {
		const parsed = JSON.parse(envelope.body) as { message?: unknown }
		if (typeof parsed?.message === 'string' && parsed.message.length > 0) {
			return parsed.message
		}
	} catch {}
	return envelope.body
}

const unwrapBridgeResponse = <T>(context: string, payload: T | BridgeApiErrorEnvelope): T => {
	if (!isBridgeApiErrorEnvelope(payload)) return payload as T
	const message = extractEnvelopeMessage(payload)
	throw new Error(`${context}: [${payload.statusCode}] ${message}`)
}

export function fetchBridges(includeChains = false): Promise<RawBridgesResponse> {
	const query = includeChains ? '?includeChains=true' : ''
	const url = `${BRIDGES_API}${query}`
	return fetchJson<RawBridgesResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}

export function fetchBridgeVolumeAll(id?: string | number): Promise<RawBridgeVolumeResponse> {
	const query = id == null ? '' : `?id=${encodeURIComponent(String(id))}`
	const url = `${BRIDGEVOLUME_API}/all${query}`
	return fetchJson<RawBridgeVolumeResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}

export function fetchBridgeVolumeByChain(chain: string, id?: string | number): Promise<RawBridgeVolumeResponse> {
	const query = id == null ? '' : `?id=${encodeURIComponent(String(id))}`
	const url = `${BRIDGEVOLUME_API}/${encodeURIComponent(chain)}${query}`
	return fetchJson<RawBridgeVolumeResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}

export function fetchBridgeVolumeBySlug(protocolSlug: string): Promise<RawBridgeVolumeBySlugResponse> {
	const url = `${BRIDGEVOLUME_API_SLUG}/${encodeURIComponent(protocolSlug)}`
	return fetchJson<RawBridgeVolumeBySlugResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}

export function fetchBridgeDayStats(
	timestamp: number,
	chain: string,
	id?: string | number
): Promise<RawBridgeDayStatsResponse> {
	const query = id == null ? '' : `?id=${encodeURIComponent(String(id))}`
	const url = `${BRIDGEDAYSTATS_API}/${encodeURIComponent(String(timestamp))}/${encodeURIComponent(chain)}${query}`
	return fetchJson<RawBridgeDayStatsResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}

export function fetchBridgeLargeTransactions(
	startTimestamp: number,
	endTimestamp: number,
	chain?: string
): Promise<RawBridgeLargeTransactionsResponse> {
	const chainOrAll = chain ? encodeURIComponent(chain) : 'all'
	const url = `${BRIDGELARGETX_API}/${chainOrAll}?starttimestamp=${encodeURIComponent(String(startTimestamp))}&endtimestamp=${encodeURIComponent(String(endTimestamp))}`
	return fetchJson<RawBridgeLargeTransactionsResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}

export function fetchBridgeTxCounts(chain?: string): Promise<RawBridgeTxCountsResponse> {
	const chainOrAll = chain ? encodeURIComponent(chain) : 'all'
	const url = `${BRIDGETXCOUNT_API}/${chainOrAll}`
	return fetchJson<RawBridgeTxCountsResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}

export function fetchBridgeTransactions(
	bridgeId: string | number,
	startTimestamp: number,
	endTimestamp: number
): Promise<RawBridgeTransactionsResponse> {
	const url = `${BRIDGETX_API}/${encodeURIComponent(String(bridgeId))}?starttimestamp=${encodeURIComponent(String(startTimestamp))}&endtimestamp=${encodeURIComponent(String(endTimestamp))}`
	return fetchJson<RawBridgeTransactionsResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}

export function fetchBridgeNetflows(period: BridgeNetflowPeriod): Promise<RawBridgeNetflowsResponse> {
	const url = `${NETFLOWS_API}/${period}`
	return fetchJson<RawBridgeNetflowsResponse | BridgeApiErrorEnvelope>(url).then((response) =>
		unwrapBridgeResponse(url, response)
	)
}
