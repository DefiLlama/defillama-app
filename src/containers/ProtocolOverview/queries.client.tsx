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
import { fetchProtocolTreasuryChart, fetchProtocolTvlChart } from './api'
import { IProtocolChartV2Params } from './api.types'
import { getProtocol } from './queries'

interface IProtocolChartParams extends Omit<IProtocolChartV2Params, 'protocol'> {
	protocol: string | null
	enabled?: boolean
}

export const useFetchProtocol = (protocolName) => {
	const isEnabled = !!protocolName
	return useQuery({
		queryKey: ['updated-protocols-data', protocolName],
		queryFn: () => getProtocol(protocolName),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 10 * 60 * 1000,
		enabled: isEnabled
	})
}

export const useFetchProtocolActiveUsers = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['activeUsers', protocolId],
		queryFn: () =>
			fetchJson(`${PROTOCOL_ACTIVE_USERS_API}/${protocolId}`.replaceAll('#', '$'))
				.then((values) => {
					return values && values.length > 0
						? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
						: null
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
export const useFetchProtocolNewUsers = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['newUsers', protocolId],
		queryFn: () =>
			fetchJson(`${PROTOCOL_NEW_USERS_API}/${protocolId}`.replaceAll('#', '$'))
				.then((values) => {
					return values && values.length > 0
						? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
						: null
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolTransactions = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocolTransactions', protocolId],
		queryFn: () =>
			fetchJson(`${PROTOCOL_TRANSACTIONS_API}/${protocolId}`.replaceAll('#', '$'))
				.then((values) => {
					return values && values.length > 0
						? values.map(([date, val]) => [+date * 1e3, +val]).sort((a, b) => a[0] - b[0])
						: null
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolGasUsed = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocolGasUsed', protocolId],
		queryFn: () =>
			fetchJson(`${PROTOCOL_GAS_USED_API}/${protocolId}`.replaceAll('#', '$'))
				.then((values) => {
					return values && values.length > 0 ? values : null
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
export const useFetchProtocolTokenLiquidity = (token: string | null) => {
	const isEnabled = !!token
	return useQuery({
		queryKey: ['tokenLiquidity', token],
		queryFn: () => fetchJson(`${TOKEN_LIQUIDITY_API}/${token!.replaceAll('#', '$')}`).catch(() => null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
export const useFetchProtocolMedianAPY = (protocolName: string | null) => {
	const isEnabled = !!protocolName
	return useQuery({
		queryKey: ['medianApy', protocolName],
		queryFn: () =>
			fetchJson(`${YIELD_PROJECT_MEDIAN_API}/${protocolName}`)
				.then((values) => {
					return values && values.data.length > 0
						? values.data.map((item) => ({ ...item, date: Math.floor(new Date(item.timestamp).getTime() / 1000) }))
						: null
				})
				.catch(() => {
					return []
				}),
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
		queryKey: ['twitterData', twitter],
		queryFn: () =>
			fetchApi(TWITTER_POSTS_API_V2 + `/${twitter?.toLowerCase()}`).then((res) =>
				res?.tweetStats ? { ...res, tweets: Object.entries(res?.tweetStats) } : {}
			),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolTVLChart = ({
	protocol,
	key,
	currency,
	breakdownType,
	enabled = true
}: IProtocolChartParams) => {
	const isEnabled = !!protocol && enabled
	return useQuery({
		queryKey: ['protocolTvlChart', protocol, key, currency, breakdownType],
		queryFn: () => fetchProtocolTvlChart({ protocol: protocol!, key, currency, breakdownType }),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolTreasuryChart = ({ protocol, key, currency, breakdownType }: IProtocolChartParams) => {
	const isEnabled = !!protocol
	return useQuery({
		queryKey: ['protocolTreasuryChart', protocol, key, currency, breakdownType],
		queryFn: () => fetchProtocolTreasuryChart({ protocol: protocol!, key, currency, breakdownType }),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
