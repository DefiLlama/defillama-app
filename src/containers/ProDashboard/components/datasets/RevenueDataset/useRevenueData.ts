import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useRevenueData(chains?: string[]) {
	// If "All" is selected, treat it as no filter (empty array)
	const filteredChains = chains?.includes('All') ? [] : chains
	
	const queryParams =
		filteredChains && filteredChains.length > 0
			? `?${filteredChains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}`
			: ''

	// Use sorted chains array to ensure consistent query key
	const sortedChains = chains ? [...chains].sort() : []

	return useQuery({
		queryKey: ['revenue-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/datasets/revenue${queryParams}`),
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 5 * 60 * 1000, // 5 minutes
		enabled: true
	})
}
