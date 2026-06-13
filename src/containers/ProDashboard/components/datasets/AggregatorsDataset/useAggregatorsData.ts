import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import type { AggregatorItem } from '~/containers/ProDashboard/types'
import { fetchJson } from '~/utils/async'

export function useAggregatorsData(chains?: string[]) {
	const streamDone = useContext(StreamDoneContext)
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	const sortedChains = chains?.length ? chains.toSorted() : []

	return useQuery<AggregatorItem[]>({
		queryKey: ['pro-dashboard', 'aggregators-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/dynamic/adapter-metrics/dex-aggregators${queryParams}`),
		enabled: streamDone,
		staleTime: Infinity,
		retry: 1
	})
}
