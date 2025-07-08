import { useMemo } from 'react'
import {
	CACHE_SERVER,
	DEV_METRICS_API,
	PROTOCOLS_API,
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_GAS_USED_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	PROTOCOL_TREASURY_API,
	TOKEN_LIQUIDITY_API,
	TWITTER_POSTS_API_V2,
	YIELD_PROJECT_MEDIAN_API
} from '~/constants'
import { fetchApi } from '~/utils/async'
import { getProtocolEmissons } from '.'
import { formatProtocolsData } from './utils'

import { fetchAndFormatGovernanceData } from '~/containers/ProtocolOverview/Governance'
import { buildProtocolAddlChartsData } from '~/containers/ProtocolOverview/utils'
import { useQuery } from '@tanstack/react-query'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import { slug } from '~/utils'

export const useFetchProtocolsList = () => {
	return useQuery({
		queryKey: [PROTOCOLS_API],
		queryFn: () => fetchApi(PROTOCOLS_API),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 10 * 60 * 1000
	})
}

export const useFetchProtocol = (protocolName) => {
	const isEnabled = !!protocolName
	return useQuery({
		queryKey: ['updated-protocols-data', protocolName, isEnabled],
		queryFn: () => getProtocol(protocolName),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 10 * 60 * 1000,
		enabled: isEnabled
	})
}

export const useFetchProtocolInfows = (protocolName, extraTvlsEnabled) => {
	const isEnabled = !!protocolName
	return useQuery({
		queryKey: ['updatedProtocolsDataWithInflows', protocolName, JSON.stringify(extraTvlsEnabled), isEnabled],
		queryFn: isEnabled
			? () =>
					getProtocol(protocolName)
						.then((protocolData) =>
							buildProtocolAddlChartsData({ protocolData: protocolData as any, extraTvlsEnabled })
						)
						.catch(() => null)
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolTreasury = (protocolName, includeTreasury) => {
	const isEnabled = !!protocolName
	return useQuery({
		queryKey: ['treasury', protocolName, includeTreasury, isEnabled],
		queryFn: isEnabled
			? () =>
					fetch(`${PROTOCOL_TREASURY_API}/${protocolName}`)
						.then((res) => res.json())
						.then((data: any) => {
							if (!includeTreasury) {
								return { ...data, chainTvls: { ...data.chainTvls, OwnTokens: {} } }
							} else return data
						})
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolActiveUsers = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['activeUsers', protocolId, isEnabled],
		queryFn: isEnabled
			? () =>
					fetch(`${PROTOCOL_ACTIVE_USERS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0
								? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
								: null
						})
						.catch((err) => [])
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
export const useFetchProtocolNewUsers = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['newUsers', protocolId, isEnabled],
		queryFn: isEnabled
			? () =>
					fetch(`${PROTOCOL_NEW_USERS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0
								? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
								: null
						})
						.catch((err) => [])
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolTransactions = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocolTransactions', protocolId, isEnabled],
		queryFn: isEnabled
			? () =>
					fetch(`${PROTOCOL_TRANSACTIONS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0
								? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
								: null
						})
						.catch((err) => [])
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolGasUsed = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocolGasUsed', protocolId, isEnabled],
		queryFn: isEnabled
			? () =>
					fetch(`${PROTOCOL_GAS_USED_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values : null
						})
						.catch((err) => [])
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
export const useFetchProtocolTokenLiquidity = (token: string | null) => {
	const isEnabled = !!token
	return useQuery({
		queryKey: ['tokenLiquidity', token, isEnabled],
		queryFn: isEnabled
			? () =>
					fetch(`${TOKEN_LIQUIDITY_API}/${token.replaceAll('#', '$')}`)
						.then((res) => res.json())

						.catch((err) => null)
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
export const useFetchProtocolMedianAPY = (protocolName: string | null) => {
	const isEnabled = !!protocolName
	return useQuery({
		queryKey: ['medianApy', protocolName, isEnabled],
		queryFn: isEnabled
			? () =>
					fetch(`${YIELD_PROJECT_MEDIAN_API}/${protocolName}`)
						.then((res) => res.json())
						.then((values) => {
							return values && values.data.length > 0
								? values.data.map((item) => ({ ...item, date: Math.floor(new Date(item.timestamp).getTime() / 1000) }))
								: null
						})
						.catch((err) => {
							return []
						})
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolGovernanceData = (governanceApis: Array<string> | null) => {
	const isEnabled = !!governanceApis && governanceApis.length > 0
	return useQuery({
		queryKey: ['protocol-governance', JSON.stringify(governanceApis), isEnabled],
		queryFn: isEnabled ? () => fetchAndFormatGovernanceData(governanceApis) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

// date in ms
interface IDenominationPriceHistory {
	prices: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}

export const useDenominationPriceHistory = (geckoId?: string) => {
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

export const useGetTokenPrice = (geckoId?: string) => {
	let url = geckoId ? `https://coins.llama.fi/prices/current/coingecko:${geckoId}` : null
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

export const useGetProtocolsList = ({ chain }) => {
	const { data, isLoading } = useQuery({
		queryKey: [PROTOCOLS_API],
		queryFn: () => fetchApi(PROTOCOLS_API),
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { fullProtocolsList, parentProtocols } = useMemo(() => {
		if (data) {
			const { protocols, parentProtocols } = data

			return {
				fullProtocolsList: formatProtocolsData({
					chain: chain === 'All' ? null : chain,
					protocols,
					removeBridges: true
				}),
				parentProtocols
			}
		}

		return { fullProtocolsList: [], parentProtocols: [] }
	}, [chain, data])

	return { fullProtocolsList, parentProtocols, isLoading }
}

export const useGetProtocolEmissions = (protocol?: string | null) => {
	const isEnabled = !!protocol
	return useQuery({
		queryKey: ['emissions', protocol, isEnabled],
		queryFn: isEnabled ? () => getProtocolEmissons(slug(protocol)) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolTwitter = (twitter?: string | null) => {
	const isEnabled = !!twitter
	return useQuery({
		queryKey: ['twitterData', twitter, isEnabled],
		queryFn: isEnabled
			? () =>
					fetchApi(TWITTER_POSTS_API_V2 + `/${twitter?.toLowerCase()}`).then((res) =>
						res?.tweetStats ? { ...res, tweets: Object.entries(res?.tweetStats) } : {}
					)
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolDevMetrics = (protocol?: string | null) => {
	const url = protocol
		? protocol?.includes('parent')
			? `${DEV_METRICS_API}/parent/${protocol?.replace('parent#', '')}.json`
			: `${DEV_METRICS_API}/${protocol}.json`
		: null
	const isEnabled = !!url
	return useQuery({
		queryKey: ['dev-metrics', url, isEnabled],
		queryFn: isEnabled ? () => fetchApi(url).catch((err) => null) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
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
		queryFn: isEnabled ? () => fetchApi(url).catch((err) => null) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
