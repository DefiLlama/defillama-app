import useSWR from 'swr'
import { DEXS_API, DEX_BASE_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'
import { IDexResponse } from './types'

export const useFetchDexsList = () => {
	const { data, error } = useSWR(`${DEXS_API}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`, fetcher)
	return { data, error, loading: !data && !error }
}

export const useFetchCharts = () => {
	const { data, error } = useSWR(`${DEXS_API}?excludeTotalDataChart=true`, fetcher)
	return { data, error, loading: !data && !error }
}

export const useFetchProtocolDex = (protocolName) => {
	const { data, error } = useSWR<IDexResponse>(protocolName ? `${DEX_BASE_API}/${protocolName}` : null, fetcher)
	const loading = !data?.volumeHistory?.length
	return { data, error, loading }
}
