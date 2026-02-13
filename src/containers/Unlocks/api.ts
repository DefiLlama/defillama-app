import { DATASETS_SERVER_URL, SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	EmissionSupplyMetrics,
	ProtocolEmission,
	ProtocolEmissionDetail,
	ProtocolEmissionSupplyMetricsEntry,
	ProtocolEmissionSupplyMetricsMap
} from './api.types'

const PROTOCOL_EMISSIONS_API = `${SERVER_URL}/emissions`
const PROTOCOL_EMISSIONS_LIST_API = `${DATASETS_SERVER_URL}/emissionsProtocolsList`
const PROTOCOL_EMISSION_API = `${SERVER_URL}/emission`
const PROTOCOL_EMISSION_API2 = `${DATASETS_SERVER_URL}/emissions`
const EMISSION_BREAKDOWN_API = `${SERVER_URL}/emissionsBreakdown`
const EMISSION_SUPPLY_METRICS_API = `${DATASETS_SERVER_URL}/emissionsSupplyMetrics`

interface WrappedBodyResponse {
	body: unknown
}

function isWrappedBodyResponse(raw: unknown): raw is WrappedBodyResponse {
	return typeof raw === 'object' && raw !== null && 'body' in raw
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value)
}

function unwrapPotentialJsonBody(raw: unknown): unknown | null {
	if (!raw) return null
	const body = isWrappedBodyResponse(raw) ? raw.body : raw
	if (body == null) return null
	if (typeof body !== 'string') return body

	try {
		return JSON.parse(body) as unknown
	} catch {
		return null
	}
}

function isProtocolEmissionDetail(value: unknown): value is ProtocolEmissionDetail {
	if (!isObjectRecord(value)) return false
	const obj = value
	return typeof obj.name === 'string' && ('metadata' in obj || 'documentedData' in obj || 'realTimeData' in obj)
}

function parseProtocolEmissionApiResponse(raw: unknown): ProtocolEmissionDetail | null {
	const body = unwrapPotentialJsonBody(raw)
	if (body == null) return null

	return isProtocolEmissionDetail(body) ? body : null
}

function parseEmissionSupplyMetrics(raw: unknown): EmissionSupplyMetrics | null {
	if (!isObjectRecord(raw)) return null
	const maxSupply = raw.maxSupply
	const adjustedSupply = raw.adjustedSupply
	const tbdAmount = raw.tbdAmount
	const incentiveAmount = raw.incentiveAmount
	const nonIncentiveAmount = raw.nonIncentiveAmount

	if (
		!isFiniteNumber(maxSupply) ||
		!isFiniteNumber(adjustedSupply) ||
		!isFiniteNumber(tbdAmount) ||
		!isFiniteNumber(incentiveAmount) ||
		!isFiniteNumber(nonIncentiveAmount)
	) {
		return null
	}

	return {
		maxSupply,
		adjustedSupply,
		tbdAmount,
		incentiveAmount,
		nonIncentiveAmount
	}
}

function parseProtocolEmissionSupplyMetricsEntry(raw: unknown): ProtocolEmissionSupplyMetricsEntry | null {
	const body = unwrapPotentialJsonBody(raw)
	if (!isObjectRecord(body)) return null
	if (typeof body.name !== 'string') return null

	const supplyMetrics = parseEmissionSupplyMetrics(body.supplyMetrics)
	if (!supplyMetrics) return null

	return {
		name: body.name,
		supplyMetrics
	}
}

function parseProtocolEmissionSupplyMetricsMap(raw: unknown): ProtocolEmissionSupplyMetricsMap {
	const body = unwrapPotentialJsonBody(raw)
	if (!isObjectRecord(body)) return {}

	const parsedMap: ProtocolEmissionSupplyMetricsMap = {}
	for (const [protocolSlug, value] of Object.entries(body)) {
		const parsedValue = parseProtocolEmissionSupplyMetricsEntry(value)
		if (parsedValue) {
			parsedMap[protocolSlug] = parsedValue
		}
	}

	return parsedMap
}

/**
 * Fetch emission data for a single protocol
 */
export async function fetchProtocolEmission(protocolName: string): Promise<ProtocolEmissionDetail | null> {
	if (!protocolName) return null
	const encodedProtocolName = encodeURIComponent(protocolName)
	try {
		const raw = await fetchJson<unknown>(`${PROTOCOL_EMISSION_API}/${encodedProtocolName}`)
		return parseProtocolEmissionApiResponse(raw)
	} catch (error) {
		console.error(`Failed to fetch protocol emission for ${protocolName}:`, error)
		return null
	}
}

/**
 * Fetch all protocol emissions data
 */
export async function fetchAllProtocolEmissions(): Promise<ProtocolEmission[]> {
	try {
		const res = await fetchJson<ProtocolEmission[]>(PROTOCOL_EMISSIONS_API)
		if (!Array.isArray(res)) return []
		return res
	} catch (error) {
		console.error('Failed to fetch all protocol emissions:', error)
		return []
	}
}

/**
 * Fetch the list of protocol names that have emissions data
 */
export async function fetchEmissionsProtocolsList(): Promise<string[]> {
	try {
		const res = await fetchJson<string[]>(PROTOCOL_EMISSIONS_LIST_API)
		if (!Array.isArray(res)) return []
		return res
	} catch (error) {
		console.error('Failed to fetch emissions protocols list:', error)
		return []
	}
}

/**
 * Fetch protocol emissions entry from the datasets endpoint.
 */
export async function fetchProtocolEmissionFromDatasets(
	protocolName: string
): Promise<ProtocolEmissionSupplyMetricsEntry | null> {
	if (!protocolName) return null
	const encodedProtocolName = encodeURIComponent(protocolName)

	try {
		const raw = await fetchJson<unknown>(`${PROTOCOL_EMISSION_API2}/${encodedProtocolName}`)
		return parseProtocolEmissionSupplyMetricsEntry(raw)
	} catch (error) {
		console.error(`Failed to fetch protocol emission datasets entry for ${protocolName}:`, error)
		return null
	}
}

/**
 * Fetch emissions supply metrics by protocol slug.
 */
export async function fetchEmissionSupplyMetrics(): Promise<ProtocolEmissionSupplyMetricsMap> {
	try {
		const raw = await fetchJson<unknown>(EMISSION_SUPPLY_METRICS_API)
		return parseProtocolEmissionSupplyMetricsMap(raw)
	} catch (error) {
		console.error('Failed to fetch emissions supply metrics:', error)
		return {}
	}
}

/**
 * Fetch the emissions breakdown payload.
 */
async function fetchEmissionBreakdown<T = unknown>(): Promise<T | null> {
	try {
		const res = await fetchJson<T>(EMISSION_BREAKDOWN_API)
		return res ?? null
	} catch (error) {
		console.error('Failed to fetch emissions breakdown:', error)
		return null
	}
}
