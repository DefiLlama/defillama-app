import { useQueries } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export interface PricePoint {
	timestamp: number
	price: number
}

interface CgChartResponse {
	data: {
		prices: Array<[number, number]>
	}
}

export const usePriceCharts = (geckoIds: string[]) => {
	const data = useQueries({
		queries: geckoIds.map((id) => ({
			queryKey: ['price_chart', id],
			queryFn: async (): Promise<CgChartResponse | null> => {
				const res = await fetchJson<CgChartResponse>(`https://fe-cache.llama.fi/cgchart/${id}`).catch(() => null)
				if (res?.data?.prices) return res
				const fallback = await fetchJson<{ prices: Array<[number, number]> }>(
					`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=365`
				)
				return { data: fallback }
			},
			staleTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0
		}))
	})

	return {
		data: Object.fromEntries(
			data.map((res, i) => {
				const points: PricePoint[] =
					res.data?.data?.prices?.reduce<PricePoint[]>((acc, point) => {
						const [timestamp, price] = point
						if (Number.isFinite(timestamp) && Number.isFinite(price)) {
							acc.push({ timestamp, price })
						}
						return acc
					}, []) ?? []

				points.sort((a, b) => a.timestamp - b.timestamp)
				return [geckoIds[i], points]
			})
		),
		isLoading: data.some((res) => res.isLoading)
	}
}
