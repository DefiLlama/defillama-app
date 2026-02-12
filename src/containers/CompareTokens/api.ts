import { DIMENSIONS_OVERVIEW_API, PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawDimensionsOverviewResponse, RawProtocolsResponse } from './api.types'

export async function fetchProtocolsList(): Promise<RawProtocolsResponse> {
	return fetchJson<RawProtocolsResponse>(PROTOCOLS_API)
}

export async function fetchFeesProtocols(): Promise<RawDimensionsOverviewResponse> {
	return fetchJson<RawDimensionsOverviewResponse>(
		`${DIMENSIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	).catch((err) => {
		console.log(`Couldn't fetch fees protocols list at path: compare-tokens`, 'Error:', err)
		return { protocols: [] }
	})
}

export async function fetchRevenueProtocols(): Promise<RawDimensionsOverviewResponse> {
	return fetchJson<RawDimensionsOverviewResponse>(
		`${DIMENSIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
	).catch((err) => {
		console.log(`Couldn't fetch revenue protocols list at path: compare-tokens`, 'Error:', err)
		return { protocols: [] }
	})
}
