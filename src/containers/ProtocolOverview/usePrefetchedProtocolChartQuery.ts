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

export function usePrefetchedProtocolChartQuery({
	label,
	queryKey,
	enabled,
	prefetchedCharts,
	queryFn
}: IUsePrefetchedProtocolChartQueryParams) {
	const prefetchedData = prefetchedCharts[label] ?? null
	const shouldFetch = enabled && !prefetchedData

	const { data: fetchedData = null, isLoading } = useQuery<Array<[number, number]> | null>({
		queryKey,
		queryFn: () => (shouldFetch ? queryFn() : Promise.resolve(null)),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: shouldFetch
	})

	return {
		data: fetchedData ?? prefetchedData,
		isLoading
	}
}
