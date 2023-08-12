import { useQueries } from 'react-query'

export const usePriceCharts = (geckoIds) => {
	const data = useQueries<any>(
		geckoIds.map((id) => ({
			queryKey: ['price_chart', id],
			queryFn: () => fetch(`https://fe-cache.llama.fi/cgchart/${id}`).then((r) => r.json()),
			staleTime: Infinity,
			cacheTime: Infinity
		}))
	)
	return {
		data: Object.fromEntries(
			data.map((res, i) => [geckoIds[i], res.data?.data?.prices?.map((price) => price[1]) || []])
		),
		isLoading: data.find((res: any) => res.isLoading)
	}
}
