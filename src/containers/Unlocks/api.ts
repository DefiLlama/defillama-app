import { DATASETS_SERVER_URL, SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ProtocolEmissionDetail, ProtocolEmission } from './api.types'

interface WrappedBodyResponse {
	body: unknown
}

function isWrappedBodyResponse(raw: unknown): raw is WrappedBodyResponse {
	return typeof raw === 'object' && raw !== null && 'body' in raw
}

function isProtocolEmissionDetail(value: unknown): value is ProtocolEmissionDetail {
	return typeof value === 'object' && value !== null && 'name' in value
}

function parseProtocolEmissionApiResponse(raw: unknown): ProtocolEmissionDetail | null {
	if (!raw) return null

	// Many endpoints respond as `{ body: string }`.
	const body = isWrappedBodyResponse(raw) ? raw.body : raw

	if (body == null) return null
	if (typeof body === 'string') {
		try {
			const parsed: unknown = JSON.parse(body)
			return isProtocolEmissionDetail(parsed) ? parsed : null
		} catch {
			return null
		}
	}

	return isProtocolEmissionDetail(body) ? body : null
}

/**
 * Fetch emission data for a single protocol
 */
export async function fetchProtocolEmission(protocolName: string): Promise<ProtocolEmissionDetail | null> {
	if (!protocolName) return null
	const encodedProtocolName = encodeURIComponent(protocolName)
	try {
		const raw = await fetchJson<unknown>(`${SERVER_URL}/emission/${encodedProtocolName}`)
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
		const res = await fetchJson<ProtocolEmission[]>(`${SERVER_URL}/emissions`)
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
		const res = await fetchJson<string[]>(`${DATASETS_SERVER_URL}/emissionsProtocolsList`)
		if (!Array.isArray(res)) return []
		return res
	} catch (error) {
		console.error('Failed to fetch emissions protocols list:', error)
		return []
	}
}
