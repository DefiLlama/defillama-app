import { useQuery } from '@tanstack/react-query'
import { CACHE_SERVER, COINS_PRICES_API } from '~/constants'
import { fetchApi } from '~/utils/async'

export const useGeckoId = (addressData: string | null) => {
	const [chain, address] = addressData?.split(':') ?? [null, null]
	const isEnabled = !!addressData
	const { data, error, isLoading } = useQuery({
		queryKey: ['geckoId', addressData, isEnabled],
		queryFn:
			address && address !== '-'
				? chain === 'coingecko'
					? () => ({ id: address })
					: () => fetchApi(`https://api.coingecko.com/api/v3/coins/${chain}/contract/${address}`)
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})

	return { data: data?.id ?? null, isLoading, error }
}

export const usePriceChart = (geckoId?: string) => {
	const url = geckoId ? `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true` : null
	const isEnabled = !!url
	return useQuery({
		queryKey: ['price-chart', url, isEnabled],
		queryFn: isEnabled ? () => fetchApi(url).catch(() => null) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useGetTokenPrice = (geckoId?: string) => {
	let url = geckoId ? `${COINS_PRICES_API}/current/coingecko:${geckoId}` : null
	const isEnabled = !!url
	const { data, isLoading, error } = useQuery({
		queryKey: ['gecko-token-price', url, isEnabled],
		queryFn: isEnabled ? () => fetchApi(url) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})

	return { data: data?.coins?.[`coingecko:${geckoId}`], error, isLoading }
}

interface IDenominationPriceHistory {
	prices: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}

// oxlint-disable-next-line no-unused-vars
const useDenominationPriceHistory = (geckoId?: string) => {
	let url = geckoId ? `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true` : null
	const isEnabled = !!url
	return useQuery<IDenominationPriceHistory>({
		queryKey: ['denom-price-history', url, isEnabled],
		queryFn: isEnabled
			? () =>
					fetchApi(url)
						.then((r) => r.data)
						.then((data) => (data.prices.length > 0 ? data : { prices: [], mcaps: [], volumes: [] }))
			: () => ({ prices: [], mcaps: [], volumes: [] }),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
