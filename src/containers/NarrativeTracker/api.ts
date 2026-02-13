import { FDV_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ICategoryInfoApiItem, ICoinInfoApiItem, PriceEntry, TimeSeriesEntry } from './api.types'

/**
 * Fetch narrative category metadata.
 */
export async function fetchCategoryInfo(): Promise<ICategoryInfoApiItem[]> {
	return fetchJson<ICategoryInfoApiItem[]>(`${FDV_SERVER_URL}/info`).catch(() => [])
}

/**
 * Fetch narrative category performance for a selected period.
 */
export async function fetchCategoryPerformance(period: string): Promise<TimeSeriesEntry[]> {
	return fetchJson<TimeSeriesEntry[]>(`${FDV_SERVER_URL}/performance/${period}`).catch(() => [])
}

/**
 * Fetch price time series for coins in a category.
 */
export async function fetchCategoryCoinPrices(categoryId: string): Promise<PriceEntry[]> {
	return fetchJson<PriceEntry[]>(`${FDV_SERVER_URL}/prices/${categoryId}`)
}

/**
 * Fetch coin-level metadata for a narrative category.
 */
export async function fetchCoinInfo(categoryId: string): Promise<ICoinInfoApiItem[]> {
	return fetchJson<ICoinInfoApiItem[]>(`${FDV_SERVER_URL}/coinInfo/${categoryId}`)
}
