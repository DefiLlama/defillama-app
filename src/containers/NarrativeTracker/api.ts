import { FDV_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ICategoryInfoApiItem, ICoinInfoApiItem, PriceEntry, TimeSeriesEntry } from './api.types'

export async function fetchCategoryInfo(): Promise<ICategoryInfoApiItem[]> {
	return fetchJson<ICategoryInfoApiItem[]>(`${FDV_SERVER_URL}/info`).catch(() => [])
}

export async function fetchCategoryPerformance(period: string): Promise<TimeSeriesEntry[]> {
	return fetchJson<TimeSeriesEntry[]>(`${FDV_SERVER_URL}/performance/${period}`).catch(() => [])
}

export async function fetchCategoryCoinPrices(categoryId: string): Promise<PriceEntry[]> {
	return fetchJson<PriceEntry[]>(`${FDV_SERVER_URL}/prices/${categoryId}`)
}

export async function fetchCoinInfo(categoryId: string): Promise<ICoinInfoApiItem[]> {
	return fetchJson<ICoinInfoApiItem[]>(`${FDV_SERVER_URL}/coinInfo/${categoryId}`)
}
