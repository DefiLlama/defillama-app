import { useQuery } from '@tanstack/react-query'
import { CACHE_SERVER, COINS_PRICES_API } from '~/constants'
import { fetchApi } from '~/utils/async'
import { getAllCGTokensList } from './index'

export const useFetchCoingeckoTokensList = () => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['coingecko-tokens-list'],
		queryFn: getAllCGTokensList,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: 1
	})

	return {
		data,
		error,
		isLoading
	}
}

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
	const url = geckoId ? `${COINS_PRICES_API}/current/coingecko:${geckoId}` : null
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

export interface IDenominationPriceHistory {
	prices: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}

const EMPTY_DENOMINATION_PRICE_HISTORY: IDenominationPriceHistory = { prices: [], mcaps: [], volumes: [] }

const normalizeDenominationPriceHistory = (value: unknown): IDenominationPriceHistory => {
	if (typeof value !== 'object' || value === null) {
		return EMPTY_DENOMINATION_PRICE_HISTORY
	}

	const candidate = value as {
		prices?: Array<[number, number]>
		mcaps?: Array<[number, number]>
		volumes?: Array<[number, number]>
	}

	const prices = Array.isArray(candidate.prices) ? candidate.prices : []
	const mcaps = Array.isArray(candidate.mcaps) ? candidate.mcaps : []
	const volumes = Array.isArray(candidate.volumes) ? candidate.volumes : []

	return { prices, mcaps, volumes }
}

export const useDenominationPriceHistory = (geckoId?: string) => {
	const url = geckoId ? `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true` : null
	const isEnabled = !!url
	return useQuery<IDenominationPriceHistory>({
		queryKey: ['denom-price-history', url, isEnabled],
		queryFn: isEnabled
			? () =>
					fetchApi(url).then((result) => {
						const normalized = normalizeDenominationPriceHistory(result)
						return normalized.prices.length > 0 ? normalized : EMPTY_DENOMINATION_PRICE_HISTORY
					})
			: () => EMPTY_DENOMINATION_PRICE_HISTORY,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
