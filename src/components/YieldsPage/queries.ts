import { useQuery } from '@tanstack/react-query'
import { COINS_API } from '~/constants'

type PriceObject = {
	confidence: number
	decimals: number
	price: number
	symbol: string
	timestamp: number
}

const useGetPrice = (tokens: Array<string>) => {
	const prices = useQuery({
		queryKey: ['prices', tokens],
		queryFn: async () => {
			const response = await fetch(`${COINS_API}/current/${tokens.join(',')}`)
			const result = await response.json()
			const data = Object.fromEntries(
				Object.entries(result.coins).map(([key, value]: [string, PriceObject]) => {
					return [key?.split(':')[1], value]
				})
			)

			return data
		},
		enabled: tokens.length > 0
	})

	return prices
}

export { useGetPrice }
