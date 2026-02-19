import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useFeesData(chains?: string[]) {
	// If "All" is selected, treat it as no filter (empty array)
	const filteredChains = chains?.includes('All') ? [] : chains

	const queryParams =
		filteredChains && filteredChains.length > 0
			? `?${filteredChains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}`
			: ''

	const sortedChains = chains?.length ? [...chains].sort() : []

	return useQuery({
		queryKey: ['fees-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/datasets/fees${queryParams}`),
		staleTime: Infinity,
		retry: 1
	})
}
