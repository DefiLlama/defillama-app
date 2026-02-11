import {
	CONFIG_API,
	PEGGED_API,
	PEGGEDCHART_API,
	PEGGEDCHART_COINS_RECENT_DATA_API,
	PEGGEDCHART_DOMINANCE_ALL_API,
	PEGGEDCONFIG_API,
	PEGGEDPRICES_API,
	PEGGEDRATES_API,
	PEGGEDS_API
} from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	BridgeInfoMap,
	ConfigApiResponse,
	PeggedAssetDetailApiResponse,
	PeggedAssetsApiResponse,
	PeggedChartApiResponse,
	PeggedConfigApiResponse,
	PeggedDominanceAllApiResponse,
	PeggedPricesApiResponse,
	PeggedRatesApiResponse
} from './api.types'

export const fetchStablecoinAssetsApi = async (): Promise<PeggedAssetsApiResponse> => {
	return fetchJson(PEGGEDS_API) as Promise<PeggedAssetsApiResponse>
}

export const fetchStablecoinPricesApi = async (): Promise<PeggedPricesApiResponse> => {
	return fetchJson(PEGGEDPRICES_API) as Promise<PeggedPricesApiResponse>
}

export const fetchStablecoinRatesApi = async (): Promise<PeggedRatesApiResponse> => {
	return fetchJson(PEGGEDRATES_API) as Promise<PeggedRatesApiResponse>
}

export const fetchStablecoinConfigApi = async (): Promise<ConfigApiResponse> => {
	return fetchJson(CONFIG_API) as Promise<ConfigApiResponse>
}

export const fetchStablecoinPeggedConfigApi = async (): Promise<PeggedConfigApiResponse> => {
	return fetchJson(PEGGEDCONFIG_API) as Promise<PeggedConfigApiResponse>
}

export const fetchStablecoinBridgeInfoApi = async (): Promise<BridgeInfoMap> => {
	return fetchJson(
		'https://llama-stablecoins-data.s3.eu-central-1.amazonaws.com/bridgeInfo.json'
	) as Promise<BridgeInfoMap>
}

export const fetchStablecoinChartApi = async (chainLabel: string): Promise<PeggedChartApiResponse> => {
	return fetchJson(`${PEGGEDCHART_API}/${chainLabel}`) as Promise<PeggedChartApiResponse>
}

export const fetchStablecoinChartAllApi = async (): Promise<PeggedChartApiResponse> => {
	return fetchJson(`${PEGGEDCHART_API}/all`) as Promise<PeggedChartApiResponse>
}

export const fetchStablecoinDominanceAllApi = async (): Promise<PeggedDominanceAllApiResponse> => {
	return fetchJson(PEGGEDCHART_DOMINANCE_ALL_API) as Promise<PeggedDominanceAllApiResponse>
}

export const fetchStablecoinAssetApi = async (peggedId: string): Promise<PeggedAssetDetailApiResponse | null> => {
	return fetchJson(`${PEGGED_API}/${peggedId}`)
		.then((data) => data as PeggedAssetDetailApiResponse)
		.catch((e) => {
			console.log(`Failed to fetch ${PEGGED_API}/${peggedId}: ${e}`)
			return null
		})
}

export const fetchStablecoinRecentCoinsDataApi = async (): Promise<Record<string, unknown[]>> => {
	return fetchJson(PEGGEDCHART_COINS_RECENT_DATA_API) as Promise<Record<string, unknown[]>>
}
