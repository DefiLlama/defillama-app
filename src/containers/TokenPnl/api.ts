import { COINS_CHART_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { RawCoinsChartResponse } from './api.types'
import type { PricePoint } from './types'

const DAY_IN_SECONDS = 86_400

export async function fetchPriceSeries(
	tokenId: string,
	start: number | null,
	end: number | null
): Promise<PricePoint[]> {
	if (!tokenId || start == null || end == null || end <= start) return []
	const key = `coingecko:${tokenId}`
	const spanInDays = Math.max(1, Math.ceil((end - start) / DAY_IN_SECONDS))
	const response = await fetchJson<RawCoinsChartResponse>(
		`${COINS_CHART_API}/${key}?start=${start}&span=${spanInDays}&searchWidth=600`
	)
	return (response?.coins?.[key]?.prices ?? [])
		.map((e) => ({ timestamp: e.timestamp, price: e.price }))
		.sort((a, b) => a.timestamp - b.timestamp)
}
