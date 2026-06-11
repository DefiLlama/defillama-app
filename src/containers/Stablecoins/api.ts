import { STABLECOINS_SERVER_URL } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type {
	StablecoinBridgeInfoResponse,
	StablecoinChartResponse,
	StablecoinConfigResponse,
	StablecoinDetailResponse,
	StablecoinDominanceResponse,
	StablecoinPricesResponse,
	StablecoinRatesResponse,
	StablecoinRecentCoinsDataResponse,
	StablecoinVolumeBreakdownChartPoint,
	StablecoinVolumeChainChartKind,
	StablecoinVolumeChartResponse,
	StablecoinVolumeGlobalChartKind,
	StablecoinVolumeTotalChartPoint,
	StablecoinVolumeTokenChartKind,
	StablecoinsListResponse
} from './api.types'

const PEGGEDS_API = `${STABLECOINS_SERVER_URL}/stablecoins`
const PEGGED_API = `${STABLECOINS_SERVER_URL}/stablecoin`
const PEGGEDCHART_API = `${STABLECOINS_SERVER_URL}/stablecoincharts2`
const PEGGEDCHART_DOMINANCE_ALL_API = `${STABLECOINS_SERVER_URL}/stablecoincharts2/all-dominance-chain-breakdown`
const PEGGEDCHART_COINS_RECENT_DATA_API = `${STABLECOINS_SERVER_URL}/stablecoincharts2/recent-protocol-data`
const PEGGEDCONFIG_API = `${STABLECOINS_SERVER_URL}/config`
const PEGGEDPRICES_API = `${STABLECOINS_SERVER_URL}/stablecoinprices`
const PEGGEDRATES_API = `${STABLECOINS_SERVER_URL}/rates`
const STABLECOIN_VOLUME_CHART_API = `${STABLECOINS_SERVER_URL}/chart/volume`

export type StablecoinVolumeChainMetadata = Record<string, { id: string; name: string }>

const toFiniteNumberOrNull = (value: unknown): number | null => {
	if (value == null) return null
	const numeric = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numeric) ? numeric : null
}

const normalizeStablecoinVolumeBreakdown = (value: unknown): Record<string, number> | null => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null

	const normalized: Record<string, number> = {}
	for (const key in value as Record<string, unknown>) {
		const numericValue = toFiniteNumberOrNull((value as Record<string, unknown>)[key])
		if (numericValue != null) normalized[key] = numericValue
	}
	return normalized
}

const normalizeStablecoinVolumeChartResponse = (
	values: unknown,
	chart: StablecoinVolumeGlobalChartKind | StablecoinVolumeChainChartKind | StablecoinVolumeTokenChartKind
): StablecoinVolumeChartResponse => {
	if (!Array.isArray(values)) return []

	if (chart === 'total') {
		const rows: StablecoinVolumeTotalChartPoint[] = []
		for (const item of values) {
			if (!Array.isArray(item) || item.length < 2) continue
			const timestamp = toFiniteNumberOrNull(item[0])
			const volume = toFiniteNumberOrNull(item[1])
			if (timestamp == null || volume == null) continue
			rows.push([timestamp, volume])
		}
		return rows
	}

	const rows: StablecoinVolumeBreakdownChartPoint[] = []
	for (const item of values) {
		if (!Array.isArray(item) || item.length < 2) continue
		const timestamp = toFiniteNumberOrNull(item[0])
		const breakdown = normalizeStablecoinVolumeBreakdown(item[1])
		if (timestamp == null || !breakdown) continue
		rows.push([timestamp, breakdown])
	}
	return rows
}

export const getStablecoinVolumeChainId = (
	chain: string,
	chainMetadata: StablecoinVolumeChainMetadata
): string | null => {
	const chainSlug = slug(chain)
	for (const key in chainMetadata) {
		const metadata = chainMetadata[key]
		if (slug(metadata.name) === chainSlug) return metadata.id
	}
	return null
}

/**
 * Fetch the stablecoin assets list.
 */
export const fetchStablecoinAssetsApi = async (options?: {
	includePrices?: boolean
}): Promise<StablecoinsListResponse> => {
	const url =
		options?.includePrices === undefined ? PEGGEDS_API : `${PEGGEDS_API}?includePrices=${options.includePrices}`

	return fetchJson<StablecoinsListResponse>(url)
}

/**
 * Fetch stablecoin price snapshots.
 */
export const fetchStablecoinPricesApi = async (): Promise<StablecoinPricesResponse> => {
	return fetchJson<StablecoinPricesResponse>(PEGGEDPRICES_API)
}

/**
 * Fetch stablecoin lending and savings rates.
 */
export const fetchStablecoinRatesApi = async (): Promise<StablecoinRatesResponse> => {
	return fetchJson<StablecoinRatesResponse>(PEGGEDRATES_API)
}

/**
 * Fetch pegged-asset configuration metadata.
 */
export const fetchStablecoinPeggedConfigApi = async (): Promise<StablecoinConfigResponse> => {
	return fetchJson<StablecoinConfigResponse>(PEGGEDCONFIG_API)
}

/**
 * Fetch stablecoin bridge information by asset.
 */
export const fetchStablecoinBridgeInfoApi = async (): Promise<StablecoinBridgeInfoResponse> => {
	return fetchJson<StablecoinBridgeInfoResponse>(
		'https://llama-stablecoins-data.s3.eu-central-1.amazonaws.com/bridgeInfo.json'
	)
}

/**
 * Fetch stablecoin chart data for a chain.
 */
export const fetchStablecoinChartApi = async (chainLabel: string): Promise<StablecoinChartResponse> => {
	return fetchJson<StablecoinChartResponse>(`${PEGGEDCHART_API}/${chainLabel}`)
}

/**
 * Fetch aggregated stablecoin chart data across all chains.
 */
export const fetchStablecoinChartAllApi = async (): Promise<StablecoinChartResponse> => {
	return fetchJson<StablecoinChartResponse>(`${PEGGEDCHART_API}/all`)
}

/**
 * Fetch stablecoin volume chart data.
 */
export const fetchStablecoinVolumeChartApi = async (
	chart: StablecoinVolumeGlobalChartKind
): Promise<StablecoinVolumeChartResponse> => {
	const pathByChart: Record<StablecoinVolumeGlobalChartKind, string> = {
		total: '',
		chain: '/chain-breakdown',
		token: '/token-breakdown',
		currency: '/currency-breakdown'
	}

	const values = await fetchJson<unknown>(`${STABLECOIN_VOLUME_CHART_API}${pathByChart[chart]}`)
	return normalizeStablecoinVolumeChartResponse(values, chart)
}

export const fetchStablecoinChainVolumeChartApi = async (
	chain: string,
	chart: StablecoinVolumeChainChartKind,
	chainMetadata: StablecoinVolumeChainMetadata
): Promise<StablecoinVolumeChartResponse> => {
	const chainId = getStablecoinVolumeChainId(chain, chainMetadata)
	if (!chainId) throw new Error(`Stablecoin volume chain id not found for ${chain}`)
	const pathByChart: Record<StablecoinVolumeChainChartKind, string> = {
		total: `/chain/${encodeURIComponent(chainId)}`,
		token: `/chain/${encodeURIComponent(chainId)}/token-breakdown`,
		currency: `/chain/${encodeURIComponent(chainId)}/currency-breakdown`
	}

	const values = await fetchJson<unknown>(`${STABLECOIN_VOLUME_CHART_API}${pathByChart[chart]}`)
	return normalizeStablecoinVolumeChartResponse(values, chart)
}

export const fetchStablecoinTokenVolumeChartApi = async (
	token: string,
	chart: StablecoinVolumeTokenChartKind
): Promise<StablecoinVolumeChartResponse> => {
	const encodedToken = encodeURIComponent(token)
	const pathByChart: Record<StablecoinVolumeTokenChartKind, string> = {
		total: `/token/${encodedToken}`,
		chain: `/token/${encodedToken}/chain-breakdown`
	}

	const values = await fetchJson<unknown>(`${STABLECOIN_VOLUME_CHART_API}${pathByChart[chart]}`)
	return normalizeStablecoinVolumeChartResponse(values, chart)
}

/**
 * Fetch global stablecoin dominance chart data.
 */
export const fetchStablecoinDominanceAllApi = async (): Promise<StablecoinDominanceResponse> => {
	return fetchJson<StablecoinDominanceResponse>(PEGGEDCHART_DOMINANCE_ALL_API)
}

/**
 * Fetch details for a single stablecoin.
 *
 * Returns `null` only when the upstream API responds with a literal `null` body.
 * Network/HTTP failures are not converted to `null` and will throw.
 */
export const fetchStablecoinAssetApi = async (peggedId: string): Promise<StablecoinDetailResponse | null> => {
	return fetchJson<StablecoinDetailResponse | null>(`${PEGGED_API}/${peggedId}`)
}

/**
 * Fetch recent per-coin chart points for stablecoins.
 */
export const fetchStablecoinRecentCoinsDataApi = async (): Promise<StablecoinRecentCoinsDataResponse> => {
	return fetchJson<StablecoinRecentCoinsDataResponse>(PEGGEDCHART_COINS_RECENT_DATA_API)
}
