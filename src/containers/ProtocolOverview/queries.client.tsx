import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { formatProtocolsData } from '~/api/categories/protocols/utils'
import {
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_GAS_USED_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	PROTOCOLS_API,
	TOKEN_LIQUIDITY_API,
	TWITTER_POSTS_API_V2,
	YIELD_PROJECT_MEDIAN_API
} from '~/constants'
import { fetchApi, fetchJson } from '~/utils/async'
import { getProtocol } from './queries'

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

export const useFetchProtocolActiveUsers = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['activeUsers', protocolId, isEnabled],
		queryFn: isEnabled
			? () =>
					fetchJson(`${PROTOCOL_ACTIVE_USERS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((values) => {
							return values && values.length > 0
								? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
								: null
						})
						.catch(() => [])
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
					fetchJson(`${PROTOCOL_NEW_USERS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((values) => {
							return values && values.length > 0
								? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
								: null
						})
						.catch(() => [])
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
					fetchJson(`${PROTOCOL_TRANSACTIONS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((values) => {
							return values && values.length > 0
								? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
								: null
						})
						.catch(() => [])
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
					fetchJson(`${PROTOCOL_GAS_USED_API}/${protocolId}`.replaceAll('#', '$'))
						.then((values) => {
							return values && values.length > 0 ? values : null
						})
						.catch(() => [])
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
			? () => fetchJson(`${TOKEN_LIQUIDITY_API}/${token.replaceAll('#', '$')}`).catch(() => null)
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
					fetchJson(`${YIELD_PROJECT_MEDIAN_API}/${protocolName}`)
						.then((values) => {
							return values && values.data.length > 0
								? values.data.map((item) => ({ ...item, date: Math.floor(new Date(item.timestamp).getTime() / 1000) }))
								: null
						})
						.catch(() => {
							return []
						})
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
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
