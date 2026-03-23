import { useQuery } from '@tanstack/react-query'
import {
	CONFIG_API,
	YIELD_CHART_API,
	YIELD_CHART_LEND_BORROW_API,
	YIELD_CONFIG_API,
	YIELD_CONFIG_POOL_API,
	YIELD_POOLS_API,
	YIELD_POOLS_LAMBDA_API,
	YIELD_VOLATILITY_API
} from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { fetchJson } from '~/utils/async'
import { formatYieldsPageData } from './utils'

// single pool
export const useYieldPoolData = (configID) => {
	const url = configID ? `${YIELD_POOLS_LAMBDA_API}?pool=${configID}` : null
	return useQuery({
		queryKey: ['yield-pool-data', url],
		queryFn: () => (url ? fetchJson(url) : null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})
}

// single pool chart data
export const useYieldChartData = (configID: string | null) => {
	return useQuery({
		queryKey: ['yield-pool-chart-data', configID],
		queryFn: () => fetchJson(`${YIELD_CHART_API}/${configID}`),
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !!configID
	})
}
export const useYieldChartLendBorrow = (configID: string | null) => {
	return useQuery({
		queryKey: ['yield-lend-borrow-chart', configID],
		queryFn: () => fetchJson(`${YIELD_CHART_LEND_BORROW_API}/${configID}`),
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !!configID
	})
}
export const useConfigPool = (configIDs) => {
	const url = configIDs ? `${YIELD_CONFIG_POOL_API}/${configIDs}` : null
	return useQuery({
		queryKey: ['yield-config-pool', url],
		queryFn: () => (url ? fetchJson(url) : null),
		staleTime: 60 * 60 * 1000
	})
}

// single pool config data
export const useYieldConfigData = (project) => {
	const url = project ? `${CONFIG_API}/smol/${project}` : null
	return useQuery({
		queryKey: ['yield-config-pool-smol', url],
		queryFn: () => (url ? fetchJson(url) : null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})
}

// oxlint-disable-next-line no-unused-vars
const useYieldPageData = () => {
	return useQuery({
		queryKey: [YIELD_POOLS_API, YIELD_CONFIG_API],
		queryFn: () => Promise.all([fetchJson(YIELD_POOLS_API), fetchJson(YIELD_CONFIG_API)]),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})
}

// oxlint-disable-next-line no-unused-vars
const useFetchProjectsList = () => {
	const { data, isLoading, error } = useQuery({
		queryKey: [YIELD_POOLS_API, YIELD_CONFIG_API],
		queryFn: () => Promise.all([fetchJson(YIELD_POOLS_API), fetchJson(YIELD_CONFIG_API)]),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const { projectList } = data ? formatYieldsPageData(data) : { projectList: [] }

	return {
		data: projectList,
		error,
		isLoading
	}
}

export const useVolatility = () => {
	const { authorizedFetch, hasActiveSubscription, isAuthenticated } = useAuthContext()

	return useQuery({
		queryKey: [YIELD_VOLATILITY_API, hasActiveSubscription],
		queryFn: async () => {
			const res = await authorizedFetch(YIELD_VOLATILITY_API)
			if (!res || !res.ok) return {}
			return res.json()
		},
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isAuthenticated && !!hasActiveSubscription
	})
}

// oxlint-disable-next-line no-unused-vars
const useYields = () => {
	const { data = {} } = useQuery({
		queryKey: [YIELD_POOLS_API],
		queryFn: () => fetchJson(YIELD_POOLS_API),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const res = data?.data

	return { data: res }
}
