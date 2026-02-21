import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useOptionsData(chains?: string[]) {
	// If "All" is selected, treat it as no filter (empty array)
	const filteredChains = chains?.includes('All') ? [] : chains

	const queryParams =
		filteredChains && filteredChains.length > 0
			? `?${filteredChains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}`
			: ''

	const sortedChains = chains?.length ? [...chains].sort() : []

	return useQuery({
		queryKey: ['pro-dashboard', 'options-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/datasets/options${queryParams}`),
		staleTime: Infinity,
		retry: 1
	})
}
