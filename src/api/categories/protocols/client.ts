import { useMemo } from 'react'
import useSWR from 'swr'
import { PROTOCOLS_API, PROTOCOL_ACTIVE_USERS_API, PROTOCOL_TREASURY_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'
import { getProtocol } from '.'
import { formatProtocolsData } from './utils'
import { capitalizeFirstLetter } from '~/utils'

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
	const { data, error } = useSWR(`treasury/${protocolName}`, () =>
		fetch(`${PROTOCOL_TREASURY_API}/${protocolName}`).then((res) => res.json())
	)

	const loading = protocolName && !data && !error

	return { data, error, loading }
}

export const useFetchProtocolActiveUsers = (protocolId: number | string) => {
	const { data, error } = useSWR(
		`activeUsers/${protocolId}`,
		protocolId
			? () =>
					fetch(`${PROTOCOL_ACTIVE_USERS_API}/${protocolId}`)
						.then((res) => res.json())
						.then((values) => {
							return values && values.length > 0 ? values : null
						})
						.catch((err) => [])
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
