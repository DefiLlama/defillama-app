import { useQuery } from '@tanstack/react-query'
import { fetchCoinPrices } from '~/api'

export const UNBOUNDED_DEBT_CEILING_PROJECTS = ['liquity-v1', 'liquity-v2'] as const

export const useGetPrice = (tokens: Array<string>) => {
	const prices = useQuery({
		queryKey: ['prices', tokens],
		queryFn: async () => {
			const result = await fetchCoinPrices(tokens)
			const data = Object.fromEntries(
				Object.entries(result).map(([key, value]) => {
					return [key?.split(':')[1], value]
				})
			)

			return data
		},
		enabled: tokens.length > 0,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	return prices
}
