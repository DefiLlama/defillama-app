import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { EmissionsBreakdownAggregatedResponse } from './api.types'

const EMISSIONS_BREAKDOWN_AGGREGATED_API = `${SERVER_URL}/emissionsBreakdownAggregated`
const EMISSIONS_CHAIN_NAME_MAP_API = `${SERVER_URL}/overview/_internal/chain-name-id-map`

export async function fetchEmissionsBreakdownAggregated(): Promise<EmissionsBreakdownAggregatedResponse | null> {
	try {
		const data = await fetchJson<EmissionsBreakdownAggregatedResponse>(EMISSIONS_BREAKDOWN_AGGREGATED_API)
		return data
	} catch (error) {
		console.error('Failed to fetch emissions breakdown aggregated:', error)
		return null
	}
}

export async function fetchEmissionsChainNameMap(): Promise<Record<string, string>> {
	try {
		const data = await fetchJson<Record<string, string>>(EMISSIONS_CHAIN_NAME_MAP_API)
		return data
	} catch (error) {
		console.error('Failed to fetch emissions chain-name map:', error)
		return {}
	}
}
