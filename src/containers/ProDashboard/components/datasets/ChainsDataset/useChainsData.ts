import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import { fetchJson } from '~/utils/async'

export function useChainsData(category?: string) {
	const streamDone = useContext(StreamDoneContext)
	const queryParams = category ? `?category=${encodeURIComponent(category)}` : ''

	return useQuery({
		queryKey: ['pro-dashboard', 'chains-overview', category || 'all'],
		queryFn: () => fetchJson(`/api/dynamic/chains${queryParams}`),
		enabled: streamDone,
		staleTime: Infinity,
		retry: 1
	})
}
