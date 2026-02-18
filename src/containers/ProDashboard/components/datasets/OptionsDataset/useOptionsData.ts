import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useOptionsData(chains?: string[]) {
	// If "All" is selected, treat it as no filter (empty array)
	const chainsSet = chains ? new Set(chains) : null
	const filteredChains = chainsSet?.has('All') ? [] : chains

	const queryParams =
		filteredChains && filteredChains.length > 0
			? `?${filteredChains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}`
			: ''

	const sortedChains = chains?.length ? [...chains].sort() : []

	return useQuery({
		queryKey: ['options-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/datasets/options${queryParams}`),
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		enabled: true
	})
}
