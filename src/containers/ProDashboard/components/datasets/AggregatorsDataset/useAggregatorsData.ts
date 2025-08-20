import { useQuery } from '@tanstack/react-query'
import { AggregatorItem } from '~/containers/ProDashboard/types'
import { fetchJson } from '~/utils/async'

export function useAggregatorsData(chains?: string[]) {
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	const sortedChains = chains ? [...chains].sort() : []

	return useQuery<AggregatorItem[]>({
		queryKey: ['aggregators-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/datasets/aggregators${queryParams}`),
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		enabled: true
	})
}
