import useSWR from 'swr'
import { HOURLY_PROTOCOL_API, PROTOCOLS_API, PROTOCOL_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'

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

export const useGeckoProtocol = (gecko_id, defaultCurrency = 'usd') => {
	const { data, error } = useSWR(
		gecko_id ? `https://api.coingecko.com/api/v3/simple/price?ids=${gecko_id}&vs_currencies=${defaultCurrency}` : null,
		fetcher
	)
	return { data, error, loading: gecko_id && !data && !error }
}

export const useDenominationPriceHistory = (geckoId?: string) => {
	let url = `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart/range?vs_currency=usd&from=0&to=`

	// append end time to fetcher params to keep query key consistent b/w renders and avoid over fetching
	const { data, error } = useSWR(geckoId ? url : null, (url) => fetcher(url + Date.now()))

	return { data, error, loading: geckoId && !data && !error }
}
