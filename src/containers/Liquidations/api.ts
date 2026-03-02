import { DATASETS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawLiquidationsAvailabilityResponse, RawLiquidationsDataResponse } from './api.types'

const LIQUIDATIONS_HISTORICAL_R2_URL = `${DATASETS_SERVER_URL}/liqs`

export function getLiquidationsHistoricalBaseUrl(): string {
	return LIQUIDATIONS_HISTORICAL_R2_URL
}

export function buildLiquidationsDataUrl(symbol: string, timestamp: number): string {
	const hourId = Math.floor(timestamp / 3600 / 6) * 6
	return `${LIQUIDATIONS_HISTORICAL_R2_URL}/${symbol.toLowerCase()}/${hourId}.json`
}

export function buildLatestLiquidationsDataUrl(symbol: string): string {
	return `${LIQUIDATIONS_HISTORICAL_R2_URL}/${symbol.toLowerCase()}/latest.json`
}

export async function fetchLiquidationsAvailability(): Promise<RawLiquidationsAvailabilityResponse> {
	return fetchJson<RawLiquidationsAvailabilityResponse>(`${LIQUIDATIONS_HISTORICAL_R2_URL}/availability.json`)
}

export async function fetchLiquidationsDataAtTimestamp(
	symbol: string,
	timestamp: number
): Promise<RawLiquidationsDataResponse> {
	return fetchJson<RawLiquidationsDataResponse>(buildLiquidationsDataUrl(symbol, timestamp))
}

export async function fetchLatestLiquidationsData(symbol: string): Promise<RawLiquidationsDataResponse> {
	return fetchJson<RawLiquidationsDataResponse>(buildLatestLiquidationsDataUrl(symbol))
}
