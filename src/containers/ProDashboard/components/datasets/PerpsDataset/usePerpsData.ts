import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function usePerpsData(chains?: string[]) {
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	const sortedChains = chains?.length ? [...chains].sort() : []

	return useQuery({
		queryKey: ['pro-dashboard', 'perps-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/datasets/perps${queryParams}`),
		staleTime: Infinity,
		retry: 1
	})
}
