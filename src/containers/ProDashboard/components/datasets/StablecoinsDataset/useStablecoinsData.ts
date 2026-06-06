import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { StreamDoneContext } from '~/containers/ProDashboard/queries'
import { fetchStablecoinsTableData } from '~/containers/ProDashboard/server/stablecoinFetchers'

export function useStablecoinsData(chain: string) {
	const streamDone = useContext(StreamDoneContext)
	return useQuery({
		queryKey: ['pro-dashboard', 'stablecoins-overview', chain],
		queryFn: () => fetchStablecoinsTableData(chain),
		enabled: streamDone,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 5 * 60 * 1000 // 5 minutes
	})
}
