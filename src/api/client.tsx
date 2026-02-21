import { useQuery } from '@tanstack/react-query'
import {
	fetchCgChartByGeckoId,
	fetchDenominationPriceHistory,
	fetchGeckoIdByAddress,
	fetchTokenPriceByGeckoId,
	fetchAllCGTokensList
} from '~/api'
import type {
	CgChartResponse,
	DenominationPriceHistory,
	GeckoIdResponse,
	IResponseCGMarketsAPI,
	PriceObject
} from './types'

export const useFetchCoingeckoTokensList = () => {
	return useQuery<Array<IResponseCGMarketsAPI>, Error>({
		queryKey: ['coingecko', 'tokens-list'],
		queryFn: fetchAllCGTokensList,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: 1
	})
}

export const useGeckoId = (addressData: string | null) => {
	const isEnabled = !!addressData
	const { data, error, isLoading } = useQuery<GeckoIdResponse | null, Error>({
		queryKey: ['coingecko', 'gecko-id', addressData],
		queryFn: isEnabled && addressData ? () => fetchGeckoIdByAddress(addressData) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})

	return { data: data?.id ?? null, isLoading, error }
}

export const usePriceChart = (geckoId?: string) => {
	const isEnabled = Boolean(geckoId)
	return useQuery<CgChartResponse | null, Error>({
		queryKey: ['coingecko', 'price-chart', geckoId],
		queryFn: isEnabled && geckoId ? () => fetchCgChartByGeckoId(geckoId) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useGetTokenPrice = (geckoId?: string) => {
	const isEnabled = Boolean(geckoId)
	return useQuery<PriceObject | null, Error>({
		queryKey: ['coingecko', 'token-price', geckoId],
		queryFn: isEnabled && geckoId ? () => fetchTokenPriceByGeckoId(geckoId) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useDenominationPriceHistory = (geckoId?: string) => {
	const isEnabled = Boolean(geckoId)
	return useQuery<DenominationPriceHistory, Error>({
		queryKey: ['coingecko', 'denom-price-history', geckoId],
		queryFn:
			isEnabled && geckoId
				? () => fetchDenominationPriceHistory(geckoId)
				: () => Promise.resolve({ prices: [], mcaps: [], volumes: [] }),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
