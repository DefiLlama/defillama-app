import { useQueries, useQuery } from '@tanstack/react-query'
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
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
import { fetchProtocolOverviewMetrics, fetchProtocolTreasuryChart, fetchProtocolTvlChart } from './api'
import {
	IProtocolChainBreakdownChart,
	IProtocolChartV2Params,
	IProtocolTokenBreakdownChart,
	IProtocolValueChart
} from './api.types'

interface IProtocolChartParams extends Omit<IProtocolChartV2Params, 'protocol'> {
	protocol: string | null
	enabled?: boolean
}

interface IProtocolValueChartParams extends Omit<IProtocolChartParams, 'breakdownType'> {
	breakdownType?: undefined
}

interface IProtocolBreakdownChartParams extends Omit<IProtocolChartParams, 'breakdownType'> {
	breakdownType: NonNullable<IProtocolChartV2Params['breakdownType']>
}

type IProtocolAnyBreakdownChart = IProtocolChainBreakdownChart | IProtocolTokenBreakdownChart
type IProtocolChartQueryData = IProtocolValueChart | IProtocolAnyBreakdownChart | null
type ProtocolChartSource = 'tvl' | 'treasury'
type IProtocolChartQueryKey = [
	'protocol-overview-tvl-chart' | 'protocol-overview-treasury-chart',
	string | null,
	string | undefined,
	string | undefined,
	string | undefined
]

const getProtocolChartQueryOptions = ({
	source,
	protocol,
	key,
	currency,
	breakdownType,
	enabled = true
}: IProtocolChartParams & { source: ProtocolChartSource }): UseQueryOptions<
	IProtocolChartQueryData,
	Error,
	IProtocolChartQueryData,
	IProtocolChartQueryKey
> => {
	const isEnabled = !!protocol && enabled
	const queryKeyPrefix = source === 'tvl' ? 'protocol-overview-tvl-chart' : 'protocol-overview-treasury-chart'
	return {
		queryKey: [queryKeyPrefix, protocol, key, currency, breakdownType],
		queryFn: () =>
			source === 'tvl'
				? fetchProtocolTvlChart({ protocol: protocol!, key, currency, breakdownType })
				: fetchProtocolTreasuryChart({ protocol: protocol!, key, currency, breakdownType }),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	}
}

const getProtocolTvlChartQueryOptions = (params: IProtocolChartParams) =>
	getProtocolChartQueryOptions({ ...params, source: 'tvl' as const })

const getProtocolTreasuryChartQueryOptions = (params: IProtocolChartParams) =>
	getProtocolChartQueryOptions({ ...params, source: 'treasury' as const })

export const useFetchProtocol = (protocolName) => {
	const isEnabled = !!protocolName
	return useQuery({
		queryKey: ['protocol-overview', 'protocol-metrics', protocolName],
		queryFn: () => fetchProtocolOverviewMetrics(protocolName),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 10 * 60 * 1000,
		enabled: isEnabled
	})
}

export const useFetchProtocolActiveUsers = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocol-overview', 'active-users', protocolId],
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
		queryKey: ['protocol-overview', 'new-users', protocolId],
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
		queryKey: ['protocol-overview', 'transactions', protocolId],
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
		queryKey: ['protocol-overview', 'gas-used', protocolId],
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
		queryKey: ['protocol-overview', 'token-liquidity', token],
		queryFn: () => fetchJson(`${TOKEN_LIQUIDITY_API}/${token!.replaceAll('#', '$')}`).catch(() => null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
export const useFetchProtocolMedianAPY = (protocolName: string | null) => {
	const isEnabled = !!protocolName
	return useQuery({
		queryKey: ['protocol-overview', 'median-apy', protocolName],
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
		queryKey: ['protocol-overview', 'protocols-list', PROTOCOLS_API],
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
		queryKey: ['protocol-overview', 'twitter-data', twitter],
		queryFn: () =>
			fetchApi(TWITTER_POSTS_API_V2 + `/${twitter?.toLowerCase()}`).then((res) =>
				res?.tweetStats ? { ...res, tweets: Object.entries(res?.tweetStats) } : {}
			),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

export function useFetchProtocolTVLChart(
	params: IProtocolBreakdownChartParams
): UseQueryResult<IProtocolAnyBreakdownChart | null>
export function useFetchProtocolTVLChart(params: IProtocolValueChartParams): UseQueryResult<IProtocolValueChart | null>
export function useFetchProtocolTVLChart({
	protocol,
	key,
	currency,
	breakdownType,
	enabled = true
}: IProtocolChartParams): UseQueryResult<IProtocolValueChart | IProtocolAnyBreakdownChart | null> {
	return useQuery<IProtocolValueChart | IProtocolAnyBreakdownChart | null>(
		getProtocolTvlChartQueryOptions({ protocol, key, currency, breakdownType, enabled })
	)
}

interface IFetchProtocolChartsByKeysParams {
	protocol: string | null
	keys: string[]
	includeBase?: boolean
	source: ProtocolChartSource
}

interface IFetchProtocolChartsByKeysResult {
	keysToFetch: Array<string | undefined>
	tvlChartQueries: Array<UseQueryResult<IProtocolValueChart | null>>
	chainBreakdownChartQueries: Array<UseQueryResult<IProtocolChainBreakdownChart | null>>
	tokenBreakdownUsdQueries: Array<UseQueryResult<IProtocolTokenBreakdownChart | null>>
	tokenBreakdownRawQueries: Array<UseQueryResult<IProtocolTokenBreakdownChart | null>>
}

export function useFetchProtocolChartsByKeys({
	protocol,
	keys,
	includeBase = true,
	source
}: IFetchProtocolChartsByKeysParams): IFetchProtocolChartsByKeysResult {
	const keysToFetch = useMemo(() => {
		const base: Array<string | undefined> = includeBase ? [undefined] : []
		return Array.from(new Set([...base, ...keys]))
	}, [includeBase, keys])

	const getQueryOptions = source === 'tvl' ? getProtocolTvlChartQueryOptions : getProtocolTreasuryChartQueryOptions

	const tvlChartQueries = useQueries({
		queries: keysToFetch.map((key) => getQueryOptions({ protocol, key }))
	}) as Array<UseQueryResult<IProtocolValueChart | null>>

	const chainBreakdownChartQueries = useQueries({
		queries: keysToFetch.map((key) => getQueryOptions({ protocol, key, breakdownType: 'chain-breakdown' }))
	}) as Array<UseQueryResult<IProtocolChainBreakdownChart | null>>

	const tokenBreakdownUsdQueries = useQueries({
		queries: keysToFetch.map((key) => getQueryOptions({ protocol, key, breakdownType: 'token-breakdown' }))
	}) as Array<UseQueryResult<IProtocolTokenBreakdownChart | null>>

	const tokenBreakdownRawQueries = useQueries({
		queries: keysToFetch.map((key) =>
			getQueryOptions({ protocol, key, breakdownType: 'token-breakdown', currency: 'token' })
		)
	}) as Array<UseQueryResult<IProtocolTokenBreakdownChart | null>>

	return {
		keysToFetch,
		tvlChartQueries,
		chainBreakdownChartQueries,
		tokenBreakdownUsdQueries,
		tokenBreakdownRawQueries
	}
}
