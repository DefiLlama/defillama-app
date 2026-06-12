import { useQuery } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import type { ProtocolChartsLabels } from './constants'

interface IUsePrefetchedProtocolChartQueryParams {
	label: ProtocolChartsLabels
	queryKey: QueryKey
	enabled: boolean
	prefetchedCharts: Partial<Record<ProtocolChartsLabels, Array<[number, number]>>>
	queryFn: () => Promise<Array<[number, number]> | null>
}

export function getPrefetchedProtocolChartQueryOptions({
	label,
	queryKey,
	enabled,
	prefetchedCharts,
	queryFn
}: IUsePrefetchedProtocolChartQueryParams) {
	const prefetchedData = prefetchedCharts[label] ?? null

	return {
		prefetchedData,
		queryOptions: {
			queryKey,
			queryFn,
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0,
			enabled: enabled && !prefetchedData
		}
	}
}

/**
 * Returns SSR-prefetched chart data when available, otherwise fetches client-side.
 * Skips the network request entirely if prefetched data exists for the given label.
 *
 * The returned object is a new reference every render — always destructure
 * immediately. Never pass it directly as a prop or into a dependency array.
 */
export function usePrefetchedProtocolChartQuery({
	label,
	queryKey,
	enabled,
	prefetchedCharts,
	queryFn
}: IUsePrefetchedProtocolChartQueryParams) {
	const { prefetchedData, queryOptions } = getPrefetchedProtocolChartQueryOptions({
		label,
		queryKey,
		enabled,
		prefetchedCharts,
		queryFn
	})

	const { data: fetchedData = null, isLoading } = useQuery<Array<[number, number]> | null>(queryOptions)

	return {
		data: fetchedData ?? prefetchedData,
		isLoading
	}
}
