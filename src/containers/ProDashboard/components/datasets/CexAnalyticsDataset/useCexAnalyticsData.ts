import { useQuery } from '@tanstack/react-query'
import type {
	CexAnalyticsMarketSharePoint,
	CexAnalyticsMetric,
	CexAnalyticsSnapshotResponse,
	CexAnalyticsTotalsPoint
} from '~/containers/ProDashboard/types'
import { fetchJson } from '~/utils/async'

const FIVE_MINUTES = 5 * 60 * 1000

export function useCexAnalyticsSnapshot(enabled = true) {
	return useQuery<CexAnalyticsSnapshotResponse>({
		queryKey: ['pro-dashboard', 'cex-analytics', 'snapshot'],
		queryFn: () => fetchJson('/api/datasets/cex-analytics?view=snapshot'),
		enabled,
		staleTime: FIVE_MINUTES,
		retry: 1
	})
}

export function useCexAnalyticsTotals(enabled = true) {
	return useQuery<CexAnalyticsTotalsPoint[]>({
		queryKey: ['pro-dashboard', 'cex-analytics', 'totals'],
		queryFn: () => fetchJson('/api/datasets/cex-analytics?view=totals'),
		enabled,
		staleTime: FIVE_MINUTES,
		retry: 1
	})
}

export function useCexAnalyticsMarketShare(metric: CexAnalyticsMetric, topN: number, enabled = true) {
	return useQuery<CexAnalyticsMarketSharePoint[]>({
		queryKey: ['pro-dashboard', 'cex-analytics', 'share', metric, topN],
		queryFn: () => fetchJson(`/api/datasets/cex-analytics?view=share&metric=${metric}&topN=${topN}`),
		enabled,
		staleTime: FIVE_MINUTES,
		retry: 1
	})
}
