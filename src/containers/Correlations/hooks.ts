import { useQueries } from '@tanstack/react-query'
import { fetchCgChartByGeckoId } from '~/api'
import type { CgChartResponse } from '~/api/types'

export interface PricePoint {
	timestamp: number
	price: number
}

export const usePriceCharts = (geckoIds: string[]) => {
	const data = useQueries({
		queries: geckoIds.map((id) => ({
			queryKey: ['price_chart', id],
			queryFn: (): Promise<CgChartResponse | null> => fetchCgChartByGeckoId(id, { fullChart: false }),
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
