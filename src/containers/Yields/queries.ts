import { useQuery } from '@tanstack/react-query'
import { COINS_PRICES_API } from '~/constants'
import { fetchJson } from '~/utils/async'

type PriceObject = {
	confidence: number
	decimals: number
	price: number
	symbol: string
	timestamp: number
}

export const useGetPrice = (tokens: Array<string>) => {
	const prices = useQuery({
		queryKey: ['prices', tokens],
		queryFn: async () => {
			const result = await fetchJson(`${COINS_PRICES_API}/current/${tokens.join(',')}`)
			const data = Object.fromEntries(
				Object.entries(result.coins).map(([key, value]: [string, PriceObject]) => {
					return [key?.split(':')[1], value]
				})
			)

			return data
		},
		enabled: tokens.length > 0,
		staleTime: 60 * 60 * 1000
	})

	return prices
}
