import { useQuery } from '@tanstack/react-query'
import { fetchCoinPrices } from '~/api/pricing'
import {
	CONFIG_API,
	YIELD_BORROW_ADVANCED_API,
	YIELD_BORROW_API,
	YIELD_CHART_API,
	YIELD_CHART_LEND_BORROW_PROXY_API,
	YIELD_CONFIG_POOL_API,
	YIELD_HOLDERS_API,
	YIELD_POOLS_LAMBDA_API,
	YIELD_VOLATILITY_API
} from '~/constants'
import { useAuthContext } from '~/containers/Subscription/auth'
import { fetchJson } from '~/utils/async'
import type { BorrowAdvancedRow } from './borrowAdvanced'
import type { BorrowPageRowsResponse } from './borrowSimple'
import type { HolderHistoryEntry, HolderStatsMap } from './queries/holderTypes'
import type { YieldsPaginatedTableResponse } from './yieldsTableQuery'

export const useGetPrice = (tokens: Array<string>) => {
	return useQuery({
		queryKey: ['yields', 'prices', tokens],
		queryFn: () => fetchCoinPrices(tokens),
		enabled: tokens.length > 0,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})
}

export const useBorrowAdvancedRows = (queryString: string | null) => {
	const url = queryString ? `${YIELD_BORROW_ADVANCED_API}${queryString}` : null
	return useQuery<BorrowAdvancedRow[]>({
		queryKey: ['yield-borrow-advanced-rows', queryString],
		queryFn: async () => (url ? fetchJson<BorrowAdvancedRow[]>(url) : []),
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !!url
	})
}

export const useBorrowRows = (queryString: string | null) => {
	const url = queryString ? `${YIELD_BORROW_API}${queryString}` : null
	return useQuery<BorrowPageRowsResponse>({
		queryKey: ['yield-borrow-rows', queryString],
		queryFn: async () =>
			url
				? fetchJson<BorrowPageRowsResponse>(url)
				: {
						rows: [],
						total: 0
					},
		placeholderData: (previousData) => previousData,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !!url
	})
}

export const useYieldsPaginatedTable = <TRow,>(endpoint: string, queryString: string | null) => {
	const url = queryString ? `${endpoint}${queryString}` : null
	return useQuery<YieldsPaginatedTableResponse<TRow>>({
		queryKey: ['yield-paginated-table', endpoint, queryString],
		queryFn: async () =>
			url
				? fetchJson<YieldsPaginatedTableResponse<TRow>>(url)
				: {
						rows: [],
						total: 0,
						page: 1,
						pageSize: 50,
						hasMore: false
					},
		placeholderData: (previousData) => previousData,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !!url
	})
}

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
		queryFn: () => fetchJson(`${YIELD_CHART_LEND_BORROW_PROXY_API}/${configID}`),
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

export const useVolatility = ({ enabled = true }: { enabled?: boolean } = {}) => {
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
		enabled: enabled && isAuthenticated && !!hasActiveSubscription
	})
}

export const useHolderStats = (configIDs?: string[], { enabled = true }: { enabled?: boolean } = {}) => {
	return useQuery<HolderStatsMap, unknown, HolderStatsMap>({
		queryKey: ['holder-stats'],
		queryFn: async () => {
			const res = await fetchJson(YIELD_HOLDERS_API)
			const raw = res?.data ?? {}
			const result: HolderStatsMap = {}
			for (const id in raw) {
				const e = raw[id] as any
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
		retry: 1,
		enabled
	})
}

export const useHolderHistory = (configID: string | null) => {
	return useQuery<HolderHistoryEntry[]>({
		queryKey: ['holder-history', configID],
		queryFn: async () => {
			const res = await fetchJson(`${YIELD_HOLDERS_API}/${configID}`)
			const rows: HolderHistoryEntry[] = []
			for (const row of res?.data ?? []) {
				rows.push({
					timestamp: row.timestamp,
					holderCount: row.holderCount ?? null,
					avgPositionUsd: row.avgPositionUsd != null ? Number(row.avgPositionUsd) : null,
					top10Pct: row.top10Pct != null ? Number(row.top10Pct) : null,
					top10Holders: row.top10Holders?.holders ?? null
				})
			}
			return rows
		},
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !!configID
	})
}
