import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import { fetchJson } from '~/utils/async'

export function useBridgeAggregatorsData(chains?: string[]) {
	const streamDone = useContext(StreamDoneContext)
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	const sortedChains = chains?.length ? chains.toSorted() : []

	return useQuery({
		queryKey: ['pro-dashboard', 'bridge-aggregators-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/dynamic/adapter-metrics/bridge-aggregators${queryParams}`),
		enabled: streamDone,
		staleTime: Infinity,
		retry: 1
	})
}
