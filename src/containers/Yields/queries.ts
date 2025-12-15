import { useQuery } from '@tanstack/react-query'
import { fetchCoinPrices } from '~/api'

export const UNBOUNDED_DEBT_CEILING_PROJECTS = ['liquity-v1', 'liquity-v2'] as const

export const useGetPrice = (tokens: Array<string>) => {
	const prices = useQuery({
		queryKey: ['prices', tokens],
		queryFn: async () => {
			const result = await fetchCoinPrices(tokens)

			return result
		},
		enabled: tokens.length > 0,
		staleTime: 60 * 60 * 1000
	})

	return prices
}
