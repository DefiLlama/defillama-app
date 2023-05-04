import useSWR from 'swr'
import { ADAPTORS_BASE_API, ADAPTORS_SUMMARY_BASE_API } from '~/constants'
import { fetcher, fetcherWErrorHandling } from '~/utils/useSWR'
import { generateGetOverviewItemPageDate, ProtocolAdaptorSummaryProps } from '.'
import type { IGetOverviewResponseBody } from './types'

export const useFetchAdaptorsList = (type: string) => {
	const { data, error } = useSWR<IGetOverviewResponseBody>(
		`${ADAPTORS_BASE_API}/${type}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`,
		fetcher
	)
	return { data, error, loading: !data && !error }
}

export const useFetchCharts = (type: string, chain?: string, dataType?: string, disable?: boolean) => {
	const { data, error } = useSWR<IGetOverviewResponseBody>(!disable ? getAPIUrl(type, chain, true, false, dataType) : null, fetcher)
	return { data, error, loading: !data && !error }
}

export const getAPIUrl = (
	type: string,
	chain?: string,
	excludeTotalDataChart?: boolean,
	excludeTotalDataChartBreakdown?: boolean,
	dataType?: string,
	fullChart?: boolean
) => {
	let API = `${ADAPTORS_BASE_API}/${type}${chain ? `/${chain}?` : '?'}`
	API = `${API}excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	if (dataType) API = `${API}&dataType=${dataType}`
	if (fullChart) API = `${API}&fullChart=${true}`
	return API
}

export const useFetchChartsSummary = (type: string, protocolName: string, dataType?: string, disable?: boolean) => {
	const fetch = async (input: RequestInfo, init?: RequestInit) =>
		fetcherWErrorHandling(input, init).then((item) => {
			return generateGetOverviewItemPageDate(item, type, protocolName)
		})

	const { data, error } = useSWR<ProtocolAdaptorSummaryProps>(
		!disable ? getAPIUrlSummary(type, protocolName, dataType) : null,
		fetch,
		{
			onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
				if ([502, 404].includes(error.status)) return
				setTimeout(() => revalidate({ retryCount }), retryCount * 5000)
			}
		}
	)

	return { data, error, loading: disable ? false : !data && !error }
}

export const getAPIUrlSummary = (type: string, protocolName: string, dataType?: string, fullChart?: boolean) => {
	let API = `${ADAPTORS_SUMMARY_BASE_API}/${type}/${protocolName}?`
	if (dataType) API = `${API}dataType=${dataType}&`
	if (fullChart) API = `${API}fullChart=${true}`
	return API
}

/* export const useFetchProtocolDex = (protocolName) => {
	const { data, error } = useSWR<IDexResponse>(protocolName ? `${DEX_BASE_API}/${protocolName}` : null, fetcher)
	const loading = !data?.volumeHistory?.length
	return { data, error, loading }
} */
