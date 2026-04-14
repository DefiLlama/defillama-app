import { useQueries, useQuery } from '@tanstack/react-query'
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchJson } from '~/utils/async'
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
type IActivityChart = Array<[number, number]> | null
type IProtocolChartQueryKey = [
	'protocol-overview',
	'tvl-chart' | 'treasury-chart',
	string | null,
	string | undefined,
	string | undefined,
	string | undefined
]

const buildProtocolChartApiUrl = (params: Record<string, string | undefined>) => {
	const searchParams = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value != null) {
			searchParams.set(key, value)
		}
	}
	return `/api/charts/protocol?${searchParams.toString()}`
}

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
			fetchJson<IProtocolChartQueryData>(
				buildProtocolChartApiUrl({
					kind: source,
					protocol: protocol!,
					key,
					currency,
					breakdownType
				})
			),
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

const normalizeActivityChart = (values: Array<[number, number]> | null): IActivityChart =>
	values && values.length > 0
		? values.map(([date, val]): [number, number] => [date * 1e3, +val]).sort((a, b) => a[0] - b[0])
		: null

export const useFetchProtocolActivityChart = ({
	queryKey,
	protocol,
	adapterType,
	dataType
}: {
	queryKey: string
	protocol: string | null
	adapterType: 'active-users' | 'new-users'
	dataType?: 'dailyTransactionsCount' | 'dailyGasUsed'
}) => {
	const isEnabled = !!protocol
	return useQuery({
		queryKey: ['protocol-overview', queryKey, protocol],
		queryFn: () =>
			fetchJson<Array<[number, number]>>(
				buildProtocolChartApiUrl({
					kind: 'adapter',
					adapterType,
					protocol: protocol!,
					dataType
				})
			)
				.then((values) => normalizeActivityChart(values))
				.catch(() => null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isEnabled
	})
}

export const useFetchProtocolTokenLiquidity = (token: string | null) => {
	const isEnabled = !!token
	return useQuery({
		queryKey: ['protocol-overview', 'token-liquidity', token],
		queryFn: () => fetchJson(buildProtocolChartApiUrl({ kind: 'token-liquidity', protocolId: token! })),
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
			fetchJson(buildProtocolChartApiUrl({ kind: 'median-apy', protocol: protocolName! })).catch(() => {
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
