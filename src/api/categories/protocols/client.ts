import { useMemo } from 'react'
import useSWR from 'swr'
import {
	PROTOCOLS_API,
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_GAS_USED_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	PROTOCOL_TREASURY_API,
	TOKEN_LIQUIDITY_API,
	YIELD_PROJECT_MEDIAN_API
} from '~/constants'
import { fetcher } from '~/utils/useSWR'
import { formatGovernanceData, getProtocol, getProtocolEmissons } from '.'
import { formatProtocolsData } from './utils'

export const useFetchProtocolsList = () => {
	const { data, error } = useSWR(PROTOCOLS_API, fetcher)

	return { data, error, loading: !data && !error }
}

export const useFetchProtocol = (protocolName) => {
	const { data, error } = useSWR(`updatedProtocolsData/${protocolName}`, () => getProtocol(protocolName))

	const loading = protocolName && !data && !error

	return { data, error, loading }
}

export const useFetchProtocolTreasury = (protocolName) => {
	const { data, error } = useSWR(
		`treasury/${protocolName}`,
		protocolName ? () => fetch(`${PROTOCOL_TREASURY_API}/${protocolName}`).then((res) => res.json()) : () => null
	)

	const loading = protocolName && !data && data !== null && !error

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
			: () => null
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
			: () => null
	)

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
			: () => null
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
			: () => null
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
			: () => null
	)

	return { data, error, loading: !data && data !== null && !error }
}

export const useFetchProtocolGovernanceData = (governanceApi: string | null) => {
	const { data, error } = useSWR(
		`governanceData/${governanceApi}`,
		governanceApi
			? () =>
					fetch(governanceApi)
						.then((res) => res.json())
						.then(
							(data: {
								proposals: Array<{ scores: Array<number>; choices: Array<string>; id: string }>
								stats: {
									months: {
										[date: string]: {
											total?: number
											successful?: number
											proposals: Array<string>
										}
									}
								}
							}) => {
								const { activity, maxVotes } = formatGovernanceData(data as any)

								if (activity.length === 0 && maxVotes.length === 0) {
									return null
								}

								return { activity, maxVotes }
							}
						)
						.catch((err) => {
							console.log(err)
							return null
						})
			: () => null
	)

	return { data, error, loading: !data && data !== null && !error }
}

export const useDenominationPriceHistory = (geckoId?: string) => {
	let url = `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart/range?vs_currency=usd&from=0&to=`

	// append end time to fetcher params to keep query key consistent b/w renders and avoid over fetching
	const { data, error } = useSWR(geckoId ? url : null, (url) => fetcher(url + Date.now()))

	return { data, error, loading: geckoId && !data && !error }
}

export const useGetTokenPrice = (geckoId?: string) => {
	let url = `https://coins.llama.fi/prices/current/coingecko:${geckoId}`

	const { data, error } = useSWR(geckoId ? url : null, (url) => fetcher(url))

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
	const { data, error } = useSWR(`unlocksData/${protocol}`, protocol ? () => getProtocolEmissons(protocol) : () => null)

	return { data, error, loading: protocol && !data && !error }
}
