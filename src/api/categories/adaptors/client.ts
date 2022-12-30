import useSWR from 'swr'
import { HOURLY_PROTOCOL_API, DEXS_API, PROTOCOL_API, DEX_BASE_API, ADAPTORS_BASE_API, ADAPTORS_SUMMARY_BASE_API } from '~/constants'
import { fetcher, fetcherWErrorHandling } from '~/utils/useSWR'
import { generateGetOverviewItemPageDate, getOverviewItemPageData, ProtocolAdaptorSummaryProps } from '.'
import { IGetOverviewResponseBody, ProtocolAdaptorSummaryResponse } from './types'

export const useFetchAdaptorsList = (type: string) => {
	const { data, error } = useSWR<IGetOverviewResponseBody>(`${ADAPTORS_BASE_API}/${type}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`, fetcher)
	return { data, error, loading: !data && !error }
}

export const useFetchCharts = (type: string, chain?: string, dataType?: string, disable?: boolean) => {
	const fetch = type === 'fees' || chain === 'all' || disable ? () => undefined : fetcher
	const { data, error } = useSWR<IGetOverviewResponseBody>(getAPIUrl(type, chain, true, false, dataType), fetch)
	return { data, error, loading: !data && !error }
}

export const getAPIUrl = (type: string, chain?: string, excludeTotalDataChart?: boolean, excludeTotalDataChartBreakdown?: boolean, dataType?: string, fullChart?: boolean) => {
	let API = `${ADAPTORS_BASE_API}/${type}${chain ? `/${chain}?` : '?'}`
	API = `${API}excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	if (dataType) API = `${API}&dataType=${dataType}`
	if (fullChart) API = `${API}&fullChart=${true}`
	return API
}

export const useFetchChartsSummary = (type: string, protocolName: string, dataType?: string, disable?: boolean) => {
	const fetch = disable ? () => undefined : async (input: RequestInfo, init?: RequestInit) => fetcherWErrorHandling(input, init).then((item) => {
		return generateGetOverviewItemPageDate(item, type, protocolName)
	})
	const { data, error } = useSWR<ProtocolAdaptorSummaryProps>(getAPIUrlSummary(type, protocolName, dataType), fetch, {
		onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
			if ([502, 404].includes(error.status)) return
			setTimeout(() => revalidate({ retryCount }), retryCount * 5000)
		}
	})
	return { data, error }
}

export const getAPIUrlSummary = (type: string, protocolName: string, dataType?: string, fullChart?: boolean) => {
	let API = `${ADAPTORS_SUMMARY_BASE_API}/${type}/${protocolName}?`
	if (dataType) API = `${API}dataType=${dataType}&`
	if (fullChart) API = `${API}fullChart=${true}`
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
