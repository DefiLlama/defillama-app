import { useQuery } from '@tanstack/react-query'
import { fetchBlockExplorers } from '~/api'
import {
	fetchCoinGeckoChartByIdWithCacheFallback,
	fetchCoinGeckoIdByAddress,
	fetchCoinGeckoTokensListFromDataset,
	fetchCoinPriceByCoinGeckoIdViaLlamaPrices,
	fetchDenominationPriceHistoryByCoinGeckoId
} from '~/api/coingecko'
import type {
	CgChartResponse,
	DenominationPriceHistory,
	GeckoIdResponse,
	IResponseCGMarketsAPI
} from './coingecko.types'
import type { BlockExplorersResponse, PriceObject } from './types'

export const useFetchCoingeckoTokensList = () => {
	return useQuery<Array<IResponseCGMarketsAPI>, Error>({
		queryKey: ['coingecko', 'tokens-list'],
		queryFn: fetchCoinGeckoTokensListFromDataset,
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
		queryFn: () => fetchCoinGeckoIdByAddress(addressData!),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})

	return { data: data?.id ?? null, isLoading, error }
}

export const usePriceChart = (geckoId?: string) => {
	const isEnabled = Boolean(geckoId)
	return useQuery<CgChartResponse | null, Error>({
		queryKey: ['coingecko', 'price-chart', geckoId ?? null],
		queryFn: () => fetchCoinGeckoChartByIdWithCacheFallback(geckoId!),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useGetTokenPrice = (geckoId?: string) => {
	const isEnabled = Boolean(geckoId)
	return useQuery<PriceObject | null, Error>({
		queryKey: ['coingecko', 'token-price', geckoId ?? null],
		queryFn: () => fetchCoinPriceByCoinGeckoIdViaLlamaPrices(geckoId!),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useDenominationPriceHistory = (geckoId?: string) => {
	const isEnabled = Boolean(geckoId)
	return useQuery<DenominationPriceHistory, Error>({
		queryKey: ['coingecko', 'denom-price-history', geckoId ?? null],
		queryFn: () => fetchDenominationPriceHistoryByCoinGeckoId(geckoId!),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useBlockExplorers = () => {
	return useQuery<BlockExplorersResponse, Error>({
		queryKey: ['block-explorers'],
		queryFn: fetchBlockExplorers,
		staleTime: 24 * 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: 1
	})
}
