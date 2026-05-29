import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import type { DexItem } from '~/containers/ProDashboard/types'
import { fetchJson } from '~/utils/async'

export function useDexsData(chains?: string[]) {
	const streamDone = useContext(StreamDoneContext)
	const queryParams =
		chains && chains.length > 0 ? `?${chains.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}` : ''

	const sortedChains = chains?.length ? [...chains].sort() : []

	return useQuery<DexItem[]>({
		queryKey: ['pro-dashboard', 'dexs-overview', sortedChains.join(',')],
		queryFn: () => fetchJson(`/api/dynamic/datasets/dexs${queryParams}`),
		enabled: streamDone,
		staleTime: Infinity,
		retry: 1
	})
}
