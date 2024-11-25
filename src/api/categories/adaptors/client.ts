import { DIMENISIONS_OVERVIEW_API, DIMENISIONS_SUMMARY_BASE_API } from '~/constants'
import { fetchApi } from '~/utils/async'
import { generateGetOverviewItemPageDate, ProtocolAdaptorSummaryProps } from '.'
import type { IGetOverviewResponseBody } from './types'
import { useQuery } from '@tanstack/react-query'

export const useFetchAdaptorsList = (type: string, disabled?: boolean) => {
	const url = `${DIMENISIONS_OVERVIEW_API}/${
		type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type
	}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	return useQuery<IGetOverviewResponseBody>({
		queryKey: ['adaptors-list', url],
		queryFn: url ? () => fetchApi(url) : () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: !disabled
	})
}

export const useFetchCharts = (type: string, chain?: string, dataType?: string, disable?: boolean) => {
	const url = !disable ? getAPIUrl(type, chain, true, false, dataType) : null
	return useQuery<ProtocolAdaptorSummaryProps>({
		queryKey: ['adaptors-charts', url],
		queryFn: url ? () => fetchApi(url) : () => null,
		staleTime: 60 * 60 * 1000
	})
}

export const getAPIUrl = (
	type: string,
	chain?: string,
	excludeTotalDataChart?: boolean,
	excludeTotalDataChartBreakdown?: boolean,
	dataType?: string,
	fullChart?: boolean
) => {
	let API = `${DIMENISIONS_OVERVIEW_API}/${type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type}${
		chain ? `/${chain}?` : '?'
	}`
	API = `${API}excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	if (dataType) API = `${API}&dataType=${dataType}`
	if (fullChart) API = `${API}&fullChart=${true}`
	return API
}

export const useFetchChartsSummary = (type: string, protocolName: string, dataType?: string, disable?: boolean) => {
	const url = !disable ? getAPIUrlSummary(type, protocolName, dataType) : null

	return useQuery<ProtocolAdaptorSummaryProps>({
		queryKey: ['adaptors-charts-summary', url],
		queryFn: url
			? () => fetchApi(url).then((res) => generateGetOverviewItemPageDate(res, type, protocolName))
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
		// retry: (error, _key, _config, revalidate, { retryCount }) => {
		// 	if ([502, 404].includes(error.status)) return
		// 	setTimeout(() => revalidate({ retryCount }), retryCount * 5000)
		// }
	})
}

export const getAPIUrlSummary = (type: string, protocolName: string, dataType?: string, fullChart?: boolean) => {
	let API = `${DIMENISIONS_SUMMARY_BASE_API}/${
		type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type
	}/${protocolName}?`
	if (dataType) API = `${API}dataType=${dataType}&`
	if (fullChart) API = `${API}fullChart=${true}`
	return API
}

/* export const useFetchProtocolDex = (protocolName) => {
	const { data, error } = useSWR<IDexResponse>(protocolName ? `${DEX_BASE_API}/${protocolName}` : null, fetcher)
	const loading = !data?.volumeHistory?.length
	return { data, error, loading }
} */
