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
import { getProtocol, getProtocolEmissons } from '.'
import { formatProtocolsData } from './utils'

import { fetchAndFormatGovernanceData } from '~/containers/Defi/Protocol/Governance'
import { buildProtocolAddlChartsData } from '~/containers/Defi/Protocol/utils'
import { useQuery } from '@tanstack/react-query'

export const useFetchProtocolsList = () => {
	return useQuery({
		queryKey: [PROTOCOLS_API],
		queryFn: () => fetchApi(PROTOCOLS_API),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 10 * 60 * 1000
	})
}

export const useFetchProtocol = (protocolName) => {
	return useQuery({
		queryKey: ['updated-protocols-data', protocolName],
		queryFn: () => getProtocol(protocolName),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 10 * 60 * 1000
	})
}

export const useFetchProtocolInfows = (protocolName, extraTvlsEnabled) => {
	return useQuery({
		queryKey: [`updatedProtocolsDataWithInflows/${protocolName}/${JSON.stringify(extraTvlsEnabled)}`],
		queryFn: protocolName
			? () =>
					getProtocol(protocolName)
						.then((protocolData) => buildProtocolAddlChartsData({ protocolData, extraTvlsEnabled }))
						.catch(() => null)
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}

export const useFetchProtocolTreasury = (protocolName, includeTreasury) => {
	return useQuery({
		queryKey: [`treasury/${protocolName}/${includeTreasury}`],
		queryFn: protocolName
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
		retry: 0
	})
}

export const useFetchProtocolActiveUsers = (protocolId: number | string | null) => {
	return useQuery({
		queryKey: [`activeUsers/${protocolId}`],
		queryFn: protocolId
			? () =>
					fetch(`${PROTOCOL_ACTIVE_USERS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values.sort((a, b) => a[0] - b[0]) : null
						})
						.catch((err) => [])
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}
export const useFetchProtocolNewUsers = (protocolId: number | string | null) => {
	return useQuery({
		queryKey: [`newUsers/${protocolId}`],
		queryFn: protocolId
			? () =>
					fetch(`${PROTOCOL_NEW_USERS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values.sort((a, b) => a[0] - b[0]) : null
						})
						.catch((err) => [])
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}

const getProtocolUsers = async (protocolId: number | string) => {
	const [activeUsers, newUsers] = await Promise.all([
		fetch(`${PROTOCOL_ACTIVE_USERS_API}/${protocolId}`.replaceAll('#', '$'))
			.then((res) => res.json())
			.then((values) => {
				return values && values.length > 0 ? values.sort((a, b) => a[0] - b[0]) : null
			})
			.catch(() => null),
		fetch(`${PROTOCOL_NEW_USERS_API}/${protocolId}`.replaceAll('#', '$'))
			.then((res) => res.json())
			.then((values) => {
				return values && values.length > 0 ? values.sort((a, b) => a[0] - b[0]) : null
			})
			.catch(() => null)
	])

	const users: { [date: number]: { activeUsers: number | null; newUsers: number | null } } = {}

	if (activeUsers) {
		activeUsers.forEach(([date, value]) => {
			if (!users[date]) {
				users[date] = { activeUsers: null, newUsers: null }
			}

			users[date]['activeUsers'] = value
		})
	}

	if (newUsers) {
		newUsers.forEach(([date, value]) => {
			if (!users[date]) {
				users[date] = { activeUsers: null, newUsers: null }
			}

			users[date]['newUsers'] = value
		})
	}

	return Object.entries(users).map(([date, { activeUsers, newUsers }]) => [date, activeUsers, newUsers])
}

export const useFetchProtocolUsers = (protocolId: number | string | null) => {
	return useQuery({
		queryKey: [`users/${protocolId}`],
		queryFn: protocolId ? () => getProtocolUsers(protocolId) : () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}

export const useFetchProtocolTransactions = (protocolId: number | string | null) => {
	return useQuery({
		queryKey: [`protocolTransactionsApi/${protocolId}`],
		queryFn: protocolId
			? () =>
					fetch(`${PROTOCOL_TRANSACTIONS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values : null
						})
						.catch((err) => [])
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}

export const useFetchProtocolGasUsed = (protocolId: number | string | null) => {
	return useQuery({
		queryKey: [`protocolGasUsed/${protocolId}`],
		queryFn: protocolId
			? () =>
					fetch(`${PROTOCOL_GAS_USED_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values : null
						})
						.catch((err) => [])
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}
export const useFetchProtocolTokenLiquidity = (token: string | null) => {
	return useQuery({
		queryKey: [`tokenLiquidity/${token}`],
		queryFn: token
			? () =>
					fetch(`${TOKEN_LIQUIDITY_API}/${token.replaceAll('#', '$')}`)
						.then((res) => res.json())

						.catch((err) => null)
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}
export const useFetchProtocolMedianAPY = (protocolName: string | null) => {
	return useQuery({
		queryKey: [`medianApy/${protocolName}`],
		queryFn: protocolName
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
		retry: 0
	})
}

export const useFetchProtocolGovernanceData = (governanceApis: Array<string> | null) => {
	return useQuery({
		queryKey: ['protocol-governance', JSON.stringify(governanceApis)],
		queryFn: () => fetchAndFormatGovernanceData(governanceApis),
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}

export const useDenominationPriceHistory = (geckoId?: string) => {
	let url = geckoId ? `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true` : null

	const { data, isLoading, error } = useQuery({
		queryKey: ['denom-price-history', url],
		queryFn: url ? () => fetchApi(url).then((r) => r.data) : () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const res = data && data?.prices?.length > 0 ? data : { prices: [], mcaps: [], volumes: [] }

	return { data: res, error, isLoading }
}

export const useGetTokenPrice = (geckoId?: string) => {
	let url = geckoId ? `https://coins.llama.fi/prices/current/coingecko:${geckoId}` : null

	const { data, isLoading, error } = useQuery({
		queryKey: ['gecko-token-price', url],
		queryFn: () => fetchApi(url),
		staleTime: 60 * 60 * 1000,
		retry: 0
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
	return useQuery({
		queryKey: [`unlocksData/${protocol}`],
		queryFn: protocol ? () => getProtocolEmissons(protocol) : () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}

export const useFetchProtocolTwitter = (twitter?: string | null) => {
	return useQuery({
		queryKey: [`twitterData/${twitter}`],
		queryFn: twitter
			? () =>
					fetchApi(TWITTER_POSTS_API_V2 + `/${twitter?.toLowerCase()}`).then((res) =>
						res?.tweetStats ? { ...res, tweets: Object.entries(res?.tweetStats) } : {}
					)
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}

export const useFetchProtocolDevMetrics = (protocol?: string | null) => {
	const url = protocol
		? protocol?.includes('parent')
			? `${DEV_METRICS_API}/parent/${protocol?.replace('parent#', '')}.json`
			: `${DEV_METRICS_API}/${protocol}.json`
		: null

	return useQuery({
		queryKey: ['dev-metrics', url],
		queryFn: () => fetchApi(url).catch((err) => null),
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}

export const useGeckoId = (addressData: string | null) => {
	const [chain, address] = addressData?.split(':') ?? [null, null]
	const { data, error, isLoading } = useQuery({
		queryKey: [`geckoId/${addressData}`],
		queryFn:
			address && address !== '-'
				? chain === 'coingecko'
					? () => ({ id: address })
					: () => fetchApi(`https://api.coingecko.com/api/v3/coins/${chain}/contract/${address}`)
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	return { data: data?.id ?? null, isLoading, error }
}

export const usePriceChart = (geckoId?: string) => {
	const url = geckoId ? `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true` : null
	return useQuery({
		queryKey: ['price-chart', url],
		queryFn: () => fetchApi(url).catch((err) => null),
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}
