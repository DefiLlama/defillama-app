import { useQueries } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export const usePriceCharts = (geckoIds = []) => {
	const data = useQueries({
		queries: geckoIds.map((id) => ({
			queryKey: ['price_chart', id],
			queryFn: async () => {
				const res = await fetchJson(`https://fe-cache.llama.fi/cgchart/${id}`).catch(() => null)
				if (res?.data.prices) return res
				else {
					const res = await fetchJson(
						`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=365`
					)
					return { data: res }
				}
			},
			staleTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0
		}))
	})
	return {
		data: Object.fromEntries(
			data.map((res, i) => [geckoIds[i], res.data?.data?.prices?.map((price) => price[1]) || []])
		),
		isLoading: data.find((res: any) => res.isLoading)
	}
}
