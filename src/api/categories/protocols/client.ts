import { useMemo } from 'react'
import useSWR from 'swr'
import { HOURLY_PROTOCOL_API, PROTOCOLS_API, PROTOCOL_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'
import { formatProtocolsData } from './utils'

export const useFetchProtocolsList = () => {
	const { data, error } = useSWR(PROTOCOLS_API, fetcher)
	return { data, error, loading: !data && !error }
}

export const useFetchProtocol = (protocolName) => {
	const { data, error } = useSWR(protocolName ? `${PROTOCOL_API}/${protocolName}` : null, fetcher)

	const { data: hourlyData, error: hourlyDataError } = useSWR(
		protocolName && data?.length < 7 ? `${HOURLY_PROTOCOL_API}/${protocolName}` : null,
		fetcher
	)

	const loading = protocolName && ((!data && !error) || (data?.length < 7 && (!hourlyData || !hourlyDataError)))

	return { data, error, loading }
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
