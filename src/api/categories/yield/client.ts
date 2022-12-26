import useSWR from 'swr'
import { fetcher, arrayFetcher } from '~/utils/useSWR'
import {
	CONFIG_API,
	YIELD_CONFIG_API,
	YIELD_CHART_API,
	YIELD_POOLS_API,
	YIELD_POOLS_LAMBDA_API,
	YIELD_CHART_LEND_BORROW_API,
	YIELD_CONFIG_POOL_API
} from '~/constants'
import { formatYieldsPageData } from './utils'

// single pool
export const useYieldPoolData = (configID) => {
	const url = `${YIELD_POOLS_LAMBDA_API}?pool=${configID}`
	const { data, error } = useSWR(configID ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}

// single pool chart data
export const useYieldChartData = (configID) => {
	const url = `${YIELD_CHART_API}/${configID}`
	const { data, error } = useSWR(configID ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}
export const useYieldChartLendBorrow = (configID) => {
	const url = `${YIELD_CHART_LEND_BORROW_API}/${configID}`
	const { data, error } = useSWR(configID ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}
export const useConfigPool = (configIDs) => {
	const url = `${YIELD_CONFIG_POOL_API}/${configIDs}`
	const { data, error } = useSWR(configIDs ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}

// single pool config data
export const useYieldConfigData = (project) => {
	const url = `${CONFIG_API}/smol/${project}`
	const { data, error } = useSWR(project ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}

export const useYieldPageData = () => {
	const { data, error } = useSWR('/pools-and-config', () => arrayFetcher([YIELD_POOLS_API, YIELD_CONFIG_API]))

	return {
		data,
		error,
		loading: !data && !error
	}
}

export const useFetchProjectsList = () => {
	const { data, error } = useSWR('/pools-and-config', () => arrayFetcher([YIELD_POOLS_API, YIELD_CONFIG_API]))

	const { projectList } = data ? formatYieldsPageData(data) : { projectList: [] }

	return {
		data: projectList,
		error,
		loading: !data && !error
	}
}

export const useYields = () => {
	const { data = {} } = useSWR(YIELD_POOLS_API, fetcher)

	const res = data?.data

	return { data: res }
}
