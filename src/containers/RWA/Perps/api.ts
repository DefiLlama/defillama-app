import { RWA_PERPS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	IRWAPerpsAggregateHistoricalPoint,
	IRWAPerpsBreakdownChartResponse,
	IRWAPerpsFundingHistoryParams,
	IRWAPerpsFundingHistoryPoint,
	IRWAPerpsIdMapResponse,
	IRWAPerpsListResponse,
	IRWAPerpsMarket,
	IRWAPerpsMarketChartPoint,
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

	return `${RWA_PERPS_SERVER_URL}/funding/${encodedId}${qs ? `?${qs}&zz=15` : '?zz=15'}`
}

/**
 * Fetch all markets from the latest snapshot.
 */
export async function fetchRWAPerpsCurrent(): Promise<IRWAPerpsMarket[]> {
	return fetchJson<IRWAPerpsMarket[]>(`${RWA_PERPS_SERVER_URL}/current?zz=15`)
}

/**
 * Fetch the available contracts, venues, and categories.
 */
export async function fetchRWAPerpsList(): Promise<IRWAPerpsListResponse> {
	return fetchJson<IRWAPerpsListResponse>(`${RWA_PERPS_SERVER_URL}/list?zz=15`)
}

/**
 * Fetch aggregate totals by venue and category.
 */
export async function fetchRWAPerpsStats(): Promise<IRWAPerpsStatsResponse> {
	return fetchJson<IRWAPerpsStatsResponse>(`${RWA_PERPS_SERVER_URL}/stats?zz=15`)
}

/**
 * Fetch the contract and venue to market ID mapping.
 */
export async function fetchRWAPerpsIdMap(): Promise<IRWAPerpsIdMapResponse> {
	return fetchJson<IRWAPerpsIdMapResponse>(`${RWA_PERPS_SERVER_URL}/id-map?zz=15`)
}

/**
 * Fetch a single market by its venue:contract ID.
 */
export async function fetchRWAPerpsMarketById(id: string): Promise<IRWAPerpsMarket> {
	const encodedId = encodeRWAPerpsPathSegment(id)
	return fetchJson<IRWAPerpsMarket>(`${RWA_PERPS_SERVER_URL}/market/${encodedId}?zz=15`)
}

/**
 * Fetch all markets for a contract across venues.
 */
export async function fetchRWAPerpsMarketsByContract(contract: string): Promise<IRWAPerpsMarket[]> {
	const encodedContract = encodeRWAPerpsPathSegment(contract)
	return fetchJson<IRWAPerpsMarket[]>(`${RWA_PERPS_SERVER_URL}/contract/${encodedContract}?zz=15`)
}

/**
 * Fetch all markets listed on a venue.
 */
export async function fetchRWAPerpsMarketsByVenue(venue: string): Promise<IRWAPerpsMarket[]> {
	const encodedVenue = encodeRWAPerpsPathSegment(venue)
	return fetchJson<IRWAPerpsMarket[]>(`${RWA_PERPS_SERVER_URL}/venue/${encodedVenue}?zz=15`)
}

/**
 * Fetch all markets for an asset group.
 */
export async function fetchRWAPerpsMarketsByAssetGroup(assetGroup: string): Promise<IRWAPerpsMarket[]> {
	const encodedAssetGroup = encodeRWAPerpsPathSegment(assetGroup)
	return fetchJson<IRWAPerpsMarket[]>(`${RWA_PERPS_SERVER_URL}/assetGroup/${encodedAssetGroup}?zz=15`)
}

/**
 * Fetch the historical time-series for one market.
 */
export async function fetchRWAPerpsMarketChart(id: string): Promise<IRWAPerpsMarketChartPoint[]> {
	const encodedId = encodeRWAPerpsPathSegment(id)
	return fetchJson<IRWAPerpsMarketChartPoint[]>(`${RWA_PERPS_SERVER_URL}/chart/${encodedId}?zz=15`)
}

/**
 * Fetch historical constituent rows for a venue.
 */
export async function fetchRWAPerpsVenueChart(venue: string): Promise<IRWAPerpsAggregateHistoricalPoint[]> {
	const encodedVenue = encodeRWAPerpsPathSegment(venue)
	return fetchJson<IRWAPerpsAggregateHistoricalPoint[]>(`${RWA_PERPS_SERVER_URL}/chart/venue/${encodedVenue}?zz=15`)
}

type IRWAPerpsBreakdownChartParams = {
	key: 'openInterest' | 'volume24h' | 'markets'
	venue?: string
	assetGroup?: string
	assetClass?: string
	excludeAssetClass?: string
}

export async function fetchRWAPerpsOverviewBreakdownChartData(
	params: IRWAPerpsBreakdownChartParams & { breakdown: 'venue' | 'assetGroup' | 'assetClass' | 'baseAsset' }
): Promise<IRWAPerpsBreakdownChartResponse | null> {
	const searchParams = new URLSearchParams({
		breakdown: params.breakdown,
		key: params.key
	})

	if (params.venue) searchParams.set('venue', params.venue)
	if (params.assetGroup) searchParams.set('assetGroup', params.assetGroup)
	if (params.assetClass) searchParams.set('assetClass', params.assetClass)
	if (params.excludeAssetClass) searchParams.set('excludeAssetClass', params.excludeAssetClass)

	return fetchJson<IRWAPerpsBreakdownChartResponse>(
		`${RWA_PERPS_SERVER_URL}/chart/overview-breakdown?${searchParams.toString()}`
	).catch((error) => {
		console.error('Failed to fetch RWA perps overview breakdown chart data:', error)
		return null
	})
}

export async function fetchRWAPerpsContractBreakdownChartData(
	params: IRWAPerpsBreakdownChartParams
): Promise<IRWAPerpsBreakdownChartResponse | null> {
	const searchParams = new URLSearchParams({
		key: params.key
	})

	if (params.venue) searchParams.set('venue', params.venue)
	if (params.assetGroup) searchParams.set('assetGroup', params.assetGroup)
	if (params.assetClass) searchParams.set('assetClass', params.assetClass)
	if (params.excludeAssetClass) searchParams.set('excludeAssetClass', params.excludeAssetClass)

	return fetchJson<IRWAPerpsBreakdownChartResponse>(
		`${RWA_PERPS_SERVER_URL}/chart/contract-breakdown?${searchParams.toString()}`
	).catch((error) => {
		console.error('Failed to fetch RWA perps contract breakdown chart data:', error)
		return null
	})
}

/**
 * Fetch funding history with optional startTime and endTime filters.
 */
export async function fetchRWAPerpsFundingHistory(
	id: string,
	params?: IRWAPerpsFundingHistoryParams
): Promise<IRWAPerpsFundingHistoryPoint[]> {
	return fetchJson<IRWAPerpsFundingHistoryPoint[]>(createRWAPerpsFundingHistoryUrl(id, params))
}
