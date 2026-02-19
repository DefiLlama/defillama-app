import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useEarningsData(chains?: string[]) {
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	// Use sorted chains array to ensure consistent query key
	const sortedChains = chains?.length ? [...chains].sort() : []

	return useQuery({
		queryKey: ['earnings-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/datasets/earnings${queryParams}`),
		staleTime: Infinity,
		retry: 1
	})
}
