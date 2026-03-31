import { useQuery } from '@tanstack/react-query'
import {
	CONFIG_API,
	YIELD_CHART_API,
	YIELD_CHART_LEND_BORROW_API,
	YIELD_CONFIG_API,
	YIELD_CONFIG_POOL_API,
	YIELD_HOLDERS_API,
	YIELD_POOLS_API,
	YIELD_POOLS_LAMBDA_API,
	YIELD_VOLATILITY_API
} from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { fetchJson } from '~/utils/async'
import type { HolderHistoryEntry, HolderStatsMap } from './holderTypes'
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

export const useHolderStats = (configIDs?: string[]) => {
	return useQuery<HolderStatsMap, unknown, HolderStatsMap>({
		queryKey: ['holder-stats'],
		queryFn: async () => {
			const res = await fetchJson(YIELD_HOLDERS_API)
			const raw = res?.data ?? {}
			const result: HolderStatsMap = {}
			for (const [id, entry] of Object.entries(raw)) {
				const e = entry as any
				result[id] = {
					holderCount: e.holderCount ?? null,
					avgPositionUsd: e.avgPositionUsd != null ? Number(e.avgPositionUsd) : null,
					top10Pct: e.top10Pct != null ? Number(e.top10Pct) : null,
					top10Holders: e.top10Holders?.holders ?? null,
					tokenDecimals: e.top10Holders?.decimals ?? null,
					holderChange7d: e.holderChange7d ?? null,
					holderChange30d: e.holderChange30d ?? null
				}
			}
			return result
		},
		select: configIDs
			? (data) => {
					const ids = new Set(configIDs)
					const filtered: HolderStatsMap = {}
					for (const id of ids) {
						if (data[id]) filtered[id] = data[id]
					}
					return filtered
				}
			: undefined,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1
	})
}

export const useHolderHistory = (configID: string | null) => {
	return useQuery<HolderHistoryEntry[]>({
		queryKey: ['holder-history', configID],
		queryFn: async () => {
			const res = await fetchJson(`${YIELD_HOLDERS_API}/${configID}`)
			return (res?.data ?? []).map((row: any) => ({
				timestamp: row.timestamp,
				holderCount: row.holderCount ?? null,
				avgPositionUsd: row.avgPositionUsd != null ? Number(row.avgPositionUsd) : null,
				top10Pct: row.top10Pct != null ? Number(row.top10Pct) : null,
				top10Holders: row.top10Holders?.holders ?? null
			}))
		},
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !!configID
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
