import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useBridgeAggregatorsData(chains?: string[]) {
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	const sortedChains = chains ? [...chains].sort() : []

	return useQuery({
		queryKey: ['bridge-aggregators-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/datasets/bridge-aggregators${queryParams}`),
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		enabled: true
	})
}
