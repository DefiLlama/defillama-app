import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import { fetchJson } from '~/utils/async'

export function useRevenueData(chains?: string[]) {
	const streamDone = useContext(StreamDoneContext)
	// If "All" is selected, treat it as no filter (empty array)
	const filteredChains = chains?.includes('All') ? [] : chains
	// Use sorted chains array to ensure consistent query key
	const sortedChains = filteredChains?.length ? filteredChains.toSorted() : []

	const queryParams =
		sortedChains.length > 0 ? `?${sortedChains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	return useQuery({
		queryKey: ['pro-dashboard', 'revenue-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/dynamic/datasets/revenue${queryParams}`),
		enabled: streamDone,
		staleTime: Infinity,
		retry: 1
	})
}
