import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import { fetchJson } from '~/utils/async'

export function useEarningsData(chains?: string[]) {
	const streamDone = useContext(StreamDoneContext)
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	// Use sorted chains array to ensure consistent query key
	const sortedChains = chains?.length ? chains.toSorted() : []

	return useQuery({
		queryKey: ['pro-dashboard', 'earnings-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/dynamic/datasets/earnings${queryParams}`),
		enabled: streamDone,
		staleTime: Infinity,
		retry: 1
	})
}
