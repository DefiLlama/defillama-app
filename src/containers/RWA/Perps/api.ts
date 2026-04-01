import { RWA_PERPS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	IRWAPerpsAggregateHistoricalPoint,
	IRWAPerpsFundingHistoryParams,
	IRWAPerpsFundingHistoryResponse,
	IRWAPerpsIdMapResponse,
	IRWAPerpsListResponse,
	IRWAPerpsMarket,
	IRWAPerpsMarketChartPoint,
	IRWAPerpsMarketListResponse,
	IRWAPerpsStatsResponse
} from './api.types'

function encodeRWAPerpsPathSegment(value: string): string {
	return encodeURIComponent(value)
}

function createRWAPerpsFundingHistoryUrl(id: string, params?: IRWAPerpsFundingHistoryParams): string {
	const encodedId = encodeRWAPerpsPathSegment(id)
	const searchParams = new URLSearchParams()

	if (params?.startTime !== undefined) {
		searchParams.set('startTime', String(params.startTime))
	}

	if (params?.endTime !== undefined) {
		searchParams.set('endTime', String(params.endTime))
	}

	const qs = searchParams.toString()

	return `${RWA_PERPS_SERVER_URL}/funding/${encodedId}${qs ? `?${qs}` : ''}`
}

/**
 * Fetch all markets from the latest snapshot.
 */
export async function fetchRWAPerpsCurrent(): Promise<IRWAPerpsMarket[]> {
	return fetchJson<IRWAPerpsMarket[]>(`${RWA_PERPS_SERVER_URL}/current`)
}

/**
 * Fetch the available coins, venues, and categories.
 */
export async function fetchRWAPerpsList(): Promise<IRWAPerpsListResponse> {
	return fetchJson<IRWAPerpsListResponse>(`${RWA_PERPS_SERVER_URL}/list`)
}

/**
 * Fetch aggregate totals by venue and category.
 */
export async function fetchRWAPerpsStats(): Promise<IRWAPerpsStatsResponse> {
	return fetchJson<IRWAPerpsStatsResponse>(`${RWA_PERPS_SERVER_URL}/stats`)
}

/**
 * Fetch the coin and venue to market ID mapping.
 */
export async function fetchRWAPerpsIdMap(): Promise<IRWAPerpsIdMapResponse> {
	return fetchJson<IRWAPerpsIdMapResponse>(`${RWA_PERPS_SERVER_URL}/id-map`)
}

/**
 * Fetch a single market by its venue:coin ID.
 */
export async function fetchRWAPerpsMarketById(id: string): Promise<IRWAPerpsMarket> {
	const encodedId = encodeRWAPerpsPathSegment(id)
	return fetchJson<IRWAPerpsMarket>(`${RWA_PERPS_SERVER_URL}/market/${encodedId}`)
}

/**
 * Fetch all markets for a coin across venues.
 */
export async function fetchRWAPerpsMarketsByCoin(coin: string): Promise<IRWAPerpsMarket[]> {
	const encodedCoin = encodeRWAPerpsPathSegment(coin)
	return fetchJson<IRWAPerpsMarket[]>(`${RWA_PERPS_SERVER_URL}/coin/${encodedCoin}`)
}

/**
 * Fetch all markets listed on a venue.
 */
export async function fetchRWAPerpsMarketsByVenue(venue: string): Promise<IRWAPerpsMarketListResponse> {
	const encodedVenue = encodeRWAPerpsPathSegment(venue)
	return fetchJson<IRWAPerpsMarketListResponse>(`${RWA_PERPS_SERVER_URL}/venue/${encodedVenue}`)
}

/**
 * Fetch the historical time-series for one market.
 */
export async function fetchRWAPerpsMarketChart(id: string): Promise<IRWAPerpsMarketChartPoint[]> {
	const encodedId = encodeRWAPerpsPathSegment(id)
	return fetchJson<IRWAPerpsMarketChartPoint[]>(`${RWA_PERPS_SERVER_URL}/chart/${encodedId}`)
}

/**
 * Fetch historical constituent rows for a venue.
 */
export async function fetchRWAPerpsVenueChart(venue: string): Promise<IRWAPerpsAggregateHistoricalPoint[]> {
	const encodedVenue = encodeRWAPerpsPathSegment(venue)
	return fetchJson<IRWAPerpsAggregateHistoricalPoint[]>(`${RWA_PERPS_SERVER_URL}/chart/venue/${encodedVenue}`)
}

/**
 * Fetch funding history with optional startTime and endTime filters.
 */
export async function fetchRWAPerpsFundingHistory(
	id: string,
	params?: IRWAPerpsFundingHistoryParams
): Promise<IRWAPerpsFundingHistoryResponse> {
	return fetchJson<IRWAPerpsFundingHistoryResponse>(createRWAPerpsFundingHistoryUrl(id, params))
}
