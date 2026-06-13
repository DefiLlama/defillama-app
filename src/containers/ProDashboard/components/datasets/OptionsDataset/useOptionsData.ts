import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import { fetchJson } from '~/utils/async'

export function useOptionsData(chains?: string[]) {
	const streamDone = useContext(StreamDoneContext)
	// If "All" is selected, treat it as no filter (empty array)
	const filteredChains = chains?.includes('All') ? [] : chains

	const queryParams =
		filteredChains && filteredChains.length > 0
			? `?${filteredChains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}`
			: ''

	const sortedChains = filteredChains?.length ? filteredChains.toSorted() : []

	return useQuery({
		queryKey: ['pro-dashboard', 'options-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/dynamic/adapter-metrics/options${queryParams}`),
		enabled: streamDone,
		staleTime: Infinity,
		retry: 1
	})
}
