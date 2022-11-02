import useSWR from 'swr'
import { HOURLY_PROTOCOL_API, DEXS_API, PROTOCOL_API, DEX_BASE_API, ADAPTORS_BASE_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'
import { IGetOverviewResponseBody } from './types'

export const useFetchAdaptorsList = (type: string) => {
	const { data, error } = useSWR<IGetOverviewResponseBody>(`${ADAPTORS_BASE_API}/${type}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`, fetcher)
	return { data, error, loading: !data && !error }
}

export const useFetchCharts = (type: string, chain?: string) => {
	const fetch = type === 'fees' || chain === 'all' ? () => undefined : fetcher
	let API = `${ADAPTORS_BASE_API}/${type}`
	if (chain) API = `${API}/${chain}`
	const { data, error } = useSWR<IGetOverviewResponseBody>(`${API}?excludeTotalDataChart=true`, fetch)
	return { data, error, loading: !data && !error }
}

export const getAPIUrl = (type: string, chain?: string, excludeTotalDataChart?: boolean, excludeTotalDataChartBreakdown?: boolean, dataType?: string, fullChart?: boolean) => {
	let API = `${ADAPTORS_BASE_API}/${type}${chain ? `/${chain}?` : '?'}`
	API = `${API}excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	if (dataType) API = `${API}&dataType=${dataType}`
	if (fullChart) API = `${API}&fullChart=${true}`
	return API
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

/* export const useFetchProtocolDex = (protocolName) => {
	const { data, error } = useSWR<IDexResponse>(protocolName ? `${DEX_BASE_API}/${protocolName}` : null, fetcher)
	const loading = !data?.volumeHistory?.length
	return { data, error, loading }
} */
