import { DIMENISIONS_OVERVIEW_API, DIMENISIONS_SUMMARY_BASE_API } from '~/constants'
import { fetchApi } from '~/utils/async'
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

export const getAPIUrlSummary = (type: string, protocolName: string, dataType?: string, fullChart?: boolean) => {
	let API = `${DIMENISIONS_SUMMARY_BASE_API}/${
		type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type
	}/${protocolName}?`
	if (dataType) API = `${API}dataType=${dataType}&`
	if (fullChart) API = `${API}fullChart=${true}`
	return API
}
