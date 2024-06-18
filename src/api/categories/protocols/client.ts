import { useMemo } from 'react'
import useSWR from 'swr'
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
import { fetcher } from '~/utils/useSWR'
import { getProtocol, getProtocolEmissons } from '.'
import { formatProtocolsData } from './utils'

import { fetchWithErrorLogging } from '~/utils/async'
import { fetchAndFormatGovernanceData } from '~/containers/Defi/Protocol/Governance'
import { buildProtocolAddlChartsData } from '~/containers/Defi/Protocol/utils'
import { IProtocolDevActivity } from '~/api/types'

const fetch = fetchWithErrorLogging

export const useFetchProtocolsList = () => {
	const { data, error } = useSWR(PROTOCOLS_API, fetcher)

	return { data, error, loading: !data && !error }
}

export const useFetchProtocol = (protocolName) => {
	const { data, error } = useSWR(`updatedProtocolsData/${protocolName}`, () => getProtocol(protocolName))

	const loading = protocolName && !data && !error

	return { data, error, loading }
}

export const useFetchProtocolInfows = (protocolName, extraTvlsEnabled) => {
	const { data, error } = useSWR(
		`updatedProtocolsDataWithInflows/${protocolName}/${JSON.stringify(extraTvlsEnabled)}`,
		protocolName
			? () =>
					getProtocol(protocolName)
						.then((protocolData) => buildProtocolAddlChartsData({ protocolData, extraTvlsEnabled }))
						.catch(() => null)
			: () => null,
		{ errorRetryCount: 0 }
	)

	const loading = !data && data !== null && !error

	return { data, error, loading }
}

export const useFetchProtocolTreasury = (protocolName, includeTreasury) => {
	const { data, error } = useSWR(
		`treasury/${protocolName}/${includeTreasury}`,
		protocolName
			? () =>
					fetch(`${PROTOCOL_TREASURY_API}/${protocolName}`)
						.then((res) => res.json())
						.then((data: any) => {
							if (!includeTreasury) {
								return { ...data, chainTvls: { ...data.chainTvls, OwnTokens: {} } }
							} else return data
						})
			: () => null,
		{ errorRetryCount: 0 }
	)

	const loading = !data && data !== null && !error

	return { data, error, loading }
}

export const useFetchProtocolActiveUsers = (protocolId: number | string | null) => {
	const { data, error } = useSWR(
		`activeUsers/${protocolId}`,
		protocolId
			? () =>
					fetch(`${PROTOCOL_ACTIVE_USERS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values.sort((a, b) => a[0] - b[0]) : null
						})
						.catch((err) => [])
			: () => null,
		{ errorRetryCount: 0 }
	)

	return { data, error, loading: !data && data !== null && !error }
}
export const useFetchProtocolNewUsers = (protocolId: number | string | null) => {
	const { data, error } = useSWR(
		`newUsers/${protocolId}`,
		protocolId
			? () =>
					fetch(`${PROTOCOL_NEW_USERS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values.sort((a, b) => a[0] - b[0]) : null
						})
						.catch((err) => [])
			: () => null,
		{ errorRetryCount: 0 }
	)

	return { data, error, loading: !data && data !== null && !error }
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
	const { data, error } = useSWR(`users/${protocolId}`, protocolId ? () => getProtocolUsers(protocolId) : () => null, {
		errorRetryCount: 0
	})

	return { data, error, loading: !data && data !== null && !error }
}

export const useFetchProtocolTransactions = (protocolId: number | string | null) => {
	const { data, error } = useSWR(
		`protocolTransactionsApi/${protocolId}`,
		protocolId
			? () =>
					fetch(`${PROTOCOL_TRANSACTIONS_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values : null
						})
						.catch((err) => [])
			: () => null,
		{ errorRetryCount: 0 }
	)

	return { data, error, loading: !data && data !== null && !error }
}

export const useFetchProtocolGasUsed = (protocolId: number | string | null) => {
	const { data, error } = useSWR(
		`protocolGasUsed/${protocolId}`,
		protocolId
			? () =>
					fetch(`${PROTOCOL_GAS_USED_API}/${protocolId}`.replaceAll('#', '$'))
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values : null
						})
						.catch((err) => [])
			: () => null,
		{ errorRetryCount: 0 }
	)

	return { data, error, loading: !data && data !== null && !error }
}
export const useFetchProtocolTokenLiquidity = (token: string | null) => {
	const { data, error } = useSWR(
		`tokenLiquidity/${token}`,
		token
			? () =>
					fetch(`${TOKEN_LIQUIDITY_API}/${token.replaceAll('#', '$')}`)
						.then((res) => res.json())

						.catch((err) => null)
			: () => null
	)

	return { data, error, loading: !data && data !== null && !error }
}
export const useFetchProtocolMedianAPY = (protocolName: string | null) => {
	const { data, error } = useSWR(
		`medianApy/${protocolName}`,
		protocolName
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
		{ errorRetryCount: 0 }
	)

	return { data, error, loading: !data && data !== null && !error }
}

export const useFetchProtocolGovernanceData = (governanceApis: Array<string> | null) => {
	const { data, error } = useSWR(JSON.stringify(governanceApis), () => fetchAndFormatGovernanceData(governanceApis), {
		errorRetryCount: 0
	})

	return { data, error, loading: !data && data !== null && !error }
}

export const useDenominationPriceHistory = (geckoId?: string) => {
	let url = `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`

	// append end time to fetcher params to keep query key consistent b/w renders and avoid over fetching
	const { data, error } = useSWR(geckoId ? url : null, (url) => fetcher(url).then((r) => r.data), {
		errorRetryCount: 0
	})
	const res = data && data?.prices?.length > 0 ? data : { prices: [], mcaps: [], volumes: [] }

	return { data: res, error, loading: geckoId && !data && !error }
}

export const useGetTokenPrice = (geckoId?: string) => {
	let url = `https://coins.llama.fi/prices/current/coingecko:${geckoId}`

	const { data, error } = useSWR(geckoId ? url : null, (url) => fetcher(url), { errorRetryCount: 0 })

	return { data: data?.coins?.[`coingecko:${geckoId}`], error, loading: geckoId && !data && !error }
}

export const useGetProtocolsList = ({ chain }) => {
	const { data, error } = useSWR(PROTOCOLS_API)

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

	return { fullProtocolsList, parentProtocols, isLoading: !data && !error }
}

export const useGetProtocolEmissions = (protocol?: string | null) => {
	const { data, error } = useSWR(
		`unlocksData/${protocol}`,
		protocol ? () => getProtocolEmissons(protocol) : () => null,
		{ errorRetryCount: 0 }
	)

	return { data, error, loading: !data && data !== null && !error }
}

export const useFetchProtocolTwitter = (twitter?: string | null) => {
	const { data: res, error } = useSWR(
		`twitterData1/${twitter}`,
		twitter ? () => fetch(TWITTER_POSTS_API_V2 + `/${twitter?.toLowerCase()}`).then((r) => r.json()) : () => null,
		{ errorRetryCount: 0 }
	)
	const data = { ...res, tweets: Object.entries(res?.tweetStats) }

	return { data, error, loading: twitter && !data && !error }
}

export const useFetchProtocolDevMetrics = (protocol?: string | null) => {
	const url = protocol?.includes('parent')
		? `${DEV_METRICS_API}/parent/${protocol?.replace('parent#', '')}.json`
		: `${DEV_METRICS_API}/${protocol}.json`

	const { data, error } = useSWR<IProtocolDevActivity>(
		`devMetrics/${protocol}`,
		protocol
			? () =>
					fetch(url)
						.then((res) => res.json())

						.catch((err) => null)
						.then()
			: () => null,
		{ errorRetryCount: 0 }
	)

	return { data, error, loading: !data && data !== null && !error }
}

export const useGeckoId = (addressData: string | null) => {
	const [chain, address] = addressData?.split(':') ?? [null, null]
	const { data, error } = useSWR(
		`geckoId/${addressData}`,
		address
			? async () => {
					if (chain === 'coingecko') return { id: address }
					const res = await fetch(`https://api.coingecko.com/api/v3/coins/${chain}/contract/${address}`).then((res) =>
						res.json()
					)
					return res
			  }
			: () => null,
		{ errorRetryCount: 0 }
	)

	return { data, id: data?.id, error, loading: !data && data !== null && !error }
}

export const usePriceChart = (geckoId?: string) => {
	const { data, error } = useSWR(
		geckoId ? `priceChart/${geckoId}` : null,
		() => fetch(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`).then((res) => res.json()),
		{ errorRetryCount: 0 }
	)

	return { data: data?.data, error, loading: geckoId && !data && !error }
}
