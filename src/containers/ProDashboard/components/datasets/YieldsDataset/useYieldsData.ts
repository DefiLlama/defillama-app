import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import { fetchJson } from '~/utils/async'

export function useYieldsData(chains?: string[]) {
	const streamDone = useContext(StreamDoneContext)
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''
	const sortedChains = chains?.length ? chains.toSorted() : []

	return useQuery({
		queryKey: ['pro-dashboard', 'yields-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/public/datasets/yields${queryParams}`),
		enabled: streamDone,
		staleTime: Infinity,
		retry: 1
	})
}
