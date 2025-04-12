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
import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '~/utils/async'

// single pool
export const useYieldPoolData = (configID) => {
	const url = configID ? `${YIELD_POOLS_LAMBDA_API}?pool=${configID}` : null
	return useQuery({ queryKey: ['yield-pool-data', url], queryFn: () => fetchApi(url), staleTime: 60 * 60 * 1000 })
}

// single pool chart data
export const useYieldChartData = (configID) => {
	const url = configID ? `${YIELD_CHART_API}/${configID}` : null
	return useQuery({ queryKey: ['yield-pool-chart-data', url], queryFn: () => fetchApi(url), staleTime: 60 * 60 * 1000 })
}
export const useYieldChartLendBorrow = (configID) => {
	const url = configID ? `${YIELD_CHART_LEND_BORROW_API}/${configID}` : null
	return useQuery({
		queryKey: ['yield-lend-borrow-chart', url],
		queryFn: () => fetchApi(url),
		staleTime: 60 * 60 * 1000
	})
}
export const useConfigPool = (configIDs) => {
	const url = configIDs ? `${YIELD_CONFIG_POOL_API}/${configIDs}` : null
	return useQuery({ queryKey: ['yield-config-pool', url], queryFn: () => fetchApi(url), staleTime: 60 * 60 * 1000 })
}

// single pool config data
export const useYieldConfigData = (project) => {
	const url = project ? `${CONFIG_API}/smol/${project}` : null
	return useQuery({
		queryKey: ['yield-config-pool-smol', url],
		queryFn: () => fetchApi(url),
		staleTime: 60 * 60 * 1000
	})
}

export const useYieldPageData = () => {
	return useQuery({
		queryKey: [YIELD_POOLS_API, YIELD_CONFIG_API],
		queryFn: () => fetchApi([YIELD_POOLS_API, YIELD_CONFIG_API]),
		staleTime: 60 * 60 * 1000
	})
}

export const useFetchProjectsList = () => {
	const { data, isLoading, error } = useQuery({
		queryKey: [YIELD_POOLS_API, YIELD_CONFIG_API],
		queryFn: () => fetchApi([YIELD_POOLS_API, YIELD_CONFIG_API]),
		staleTime: 60 * 60 * 1000
	})

	const { projectList } = data ? formatYieldsPageData(data) : { projectList: [] }

	return {
		data: projectList,
		error,
		isLoading
	}
}

export const useYields = () => {
	const { data = {} } = useQuery({
		queryKey: [YIELD_POOLS_API],
		queryFn: () => fetchApi(YIELD_POOLS_API),
		staleTime: 60 * 60 * 1000
	})

	const res = data?.data

	return { data: res }
}
