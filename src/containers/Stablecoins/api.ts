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
	return fetchJson<PeggedAssetsApiResponse>(PEGGEDS_API)
}

export const fetchStablecoinPricesApi = async (): Promise<PeggedPricesApiResponse> => {
	return fetchJson<PeggedPricesApiResponse>(PEGGEDPRICES_API)
}

export const fetchStablecoinRatesApi = async (): Promise<PeggedRatesApiResponse> => {
	return fetchJson<PeggedRatesApiResponse>(PEGGEDRATES_API)
}

export const fetchStablecoinConfigApi = async (): Promise<ConfigApiResponse> => {
	return fetchJson<ConfigApiResponse>(CONFIG_API)
}

export const fetchStablecoinPeggedConfigApi = async (): Promise<PeggedConfigApiResponse> => {
	return fetchJson<PeggedConfigApiResponse>(PEGGEDCONFIG_API)
}

export const fetchStablecoinBridgeInfoApi = async (): Promise<BridgeInfoMap> => {
	return fetchJson<BridgeInfoMap>('https://llama-stablecoins-data.s3.eu-central-1.amazonaws.com/bridgeInfo.json')
}

export const fetchStablecoinChartApi = async (chainLabel: string): Promise<PeggedChartApiResponse> => {
	return fetchJson<PeggedChartApiResponse>(`${PEGGEDCHART_API}/${chainLabel}`)
}

export const fetchStablecoinChartAllApi = async (): Promise<PeggedChartApiResponse> => {
	return fetchJson<PeggedChartApiResponse>(`${PEGGEDCHART_API}/all`)
}

export const fetchStablecoinDominanceAllApi = async (): Promise<PeggedDominanceAllApiResponse> => {
	return fetchJson<PeggedDominanceAllApiResponse>(PEGGEDCHART_DOMINANCE_ALL_API)
}

export const fetchStablecoinAssetApi = async (peggedId: string): Promise<PeggedAssetDetailApiResponse | null> => {
	return fetchJson<PeggedAssetDetailApiResponse>(`${PEGGED_API}/${peggedId}`).catch((e) => {
		console.log(`Failed to fetch ${PEGGED_API}/${peggedId}: ${e}`)
		return null
	})
}

export const fetchStablecoinRecentCoinsDataApi = async (): Promise<Record<string, unknown[]>> => {
	return fetchJson<Record<string, unknown[]>>(PEGGEDCHART_COINS_RECENT_DATA_API)
}
