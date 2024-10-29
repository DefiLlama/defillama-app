import { useQueries } from '@tanstack/react-query'

export const usePriceCharts = (geckoIds = []) => {
	const data = useQueries<any>({
		queries: geckoIds.map((id) => ({
			queryKey: ['price_chart', id],
			queryFn: async () => {
				const res = await fetch(`https://fe-cache.llama.fi/cgchart/${id}`)
					.then((r) => r.json())
					.catch(() => null)
				if (res?.data.prices) return res
				else {
					const res = await fetch(
						`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=365`
					).then((r) => r.json())
					return { data: res }
				}
			},
			staleTime: 10 * 60 * 1000
		}))
	})
	return {
		data: Object.fromEntries(
			data.map((res, i) => [geckoIds[i], res.data?.data?.prices?.map((price) => price[1]) || []])
		),
		isLoading: data.find((res: any) => res.isLoading)
	}
}
