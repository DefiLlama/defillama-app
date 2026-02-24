import { useQueries, useQuery } from '@tanstack/react-query'
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchProtocolTokenLiquidityChart } from '~/api'
import { YIELD_PROJECT_MEDIAN_API } from '~/constants'
import {
	fetchProtocolUsers,
	fetchProtocolNewUsers,
	fetchProtocolTransactions,
	fetchProtocolGas
} from '~/containers/OnchainUsersAndTxs/api'
import type { IUserDataResponse, ITxDataResponse, IGasDataResponse } from '~/containers/OnchainUsersAndTxs/api.types'
import { fetchJson } from '~/utils/async'
import { fetchProtocolTreasuryChart, fetchProtocolTvlChart } from './api'
import type {
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
	'protocol-overview',
	'tvl-chart' | 'treasury-chart',
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
	const chartKey = source === 'tvl' ? 'tvl-chart' : 'treasury-chart'
	return {
		queryKey: ['protocol-overview', chartKey, protocol, key, currency, breakdownType],
		queryFn: () =>
			source === 'tvl'
				? fetchProtocolTvlChart({ protocol: protocol!, key, currency, breakdownType })
				: fetchProtocolTreasuryChart({ protocol: protocol!, key, currency, breakdownType }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isEnabled
	}
}

const getProtocolTvlChartQueryOptions = (params: IProtocolChartParams) =>
	getProtocolChartQueryOptions({ ...params, source: 'tvl' as const })

const getProtocolTreasuryChartQueryOptions = (params: IProtocolChartParams) =>
	getProtocolChartQueryOptions({ ...params, source: 'treasury' as const })

export const useFetchProtocolActiveUsers = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocol-overview', 'active-users', protocolId],
		queryFn: () =>
			fetchProtocolUsers({ protocolId: protocolId! })
				.then((values: IUserDataResponse | null) => {
					return values && values.length > 0
						? values
								.map(([date, val]: [number, number]): [number, number] => [date * 1e3, val])
								.sort((a, b) => a[0] - b[0])
						: null
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isEnabled
	})
}
export const useFetchProtocolNewUsers = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocol-overview', 'new-users', protocolId],
		queryFn: () =>
			fetchProtocolNewUsers({ protocolId: protocolId! })
				.then((values: IUserDataResponse | null) => {
					return values && values.length > 0
						? values
								.map(([date, val]: [number, number]): [number, number] => [date * 1e3, val])
								.sort((a, b) => a[0] - b[0])
						: null
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolTransactions = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocol-overview', 'transactions', protocolId],
		queryFn: () =>
			fetchProtocolTransactions({ protocolId: protocolId! })
				.then((values: ITxDataResponse | null) => {
					return values && values.length > 0
						? values
								.map(([date, val]: [number, number]): [number, number] => [date * 1e3, val])
								.sort((a, b) => a[0] - b[0])
						: null
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isEnabled
	})
}

// oxlint-disable-next-line no-unused-vars
const useFetchProtocolGasUsed = (protocolId: number | string | null) => {
	const isEnabled = !!protocolId
	return useQuery({
		queryKey: ['protocol-overview', 'gas-used', protocolId],
		queryFn: () =>
			fetchProtocolGas({ protocolId: protocolId! })
				.then((values: IGasDataResponse | null) => {
					return values && values.length > 0 ? values : null
				})
				.catch(() => []),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isEnabled
	})
}
// oxlint-disable-next-line no-unused-vars
const useFetchProtocolTokenLiquidity = (token: string | null) => {
	const isEnabled = !!token
	return useQuery({
		queryKey: ['protocol-overview', 'token-liquidity', token],
		queryFn: () => fetchProtocolTokenLiquidityChart(token!),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
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
				.then((values: { data: Array<{ timestamp: string; medianAPY: number; [key: string]: unknown }> } | null) => {
					return values && values.data.length > 0
						? values.data.map((item: { timestamp: string; medianAPY: number; [key: string]: unknown }) => ({
								...item,
								date: Math.floor(new Date(item.timestamp).getTime() / 1000)
							}))
						: null
				})
				.catch(() => {
					return []
				}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
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
	return useQuery<IProtocolChartQueryData, Error, IProtocolChartQueryData, IProtocolChartQueryKey>(
		getProtocolTvlChartQueryOptions({ protocol, key, currency, breakdownType, enabled })
	)
}

interface IFetchProtocolChartsByKeysParams {
	protocol: string | null
	keys: string[]
	includeBase?: boolean
	source: ProtocolChartSource
	inflows?: boolean
	chainBreakdown?: boolean
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
	source,
	inflows = true,
	chainBreakdown = true
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
		queries: chainBreakdown
			? keysToFetch.map((key) => getQueryOptions({ protocol, key, breakdownType: 'chain-breakdown' }))
			: []
	}) as Array<UseQueryResult<IProtocolChainBreakdownChart | null>>

	const tokenBreakdownUsdQueries = useQueries({
		queries: inflows
			? keysToFetch.map((key) => getQueryOptions({ protocol, key, breakdownType: 'token-breakdown' }))
			: []
	}) as Array<UseQueryResult<IProtocolTokenBreakdownChart | null>>

	const tokenBreakdownRawQueries = useQueries({
		queries: inflows
			? keysToFetch.map((key) =>
					getQueryOptions({ protocol, key, breakdownType: 'token-breakdown', currency: 'token' })
				)
			: []
	}) as Array<UseQueryResult<IProtocolTokenBreakdownChart | null>>

	return {
		keysToFetch,
		tvlChartQueries,
		chainBreakdownChartQueries,
		tokenBreakdownUsdQueries,
		tokenBreakdownRawQueries
	}
}
