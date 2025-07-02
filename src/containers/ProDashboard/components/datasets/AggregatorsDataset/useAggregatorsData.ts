import { useQuery } from '@tanstack/react-query'

export function useAggregatorsData(chains?: string[]) {
	const queryParams = chains && chains.length > 0 
		? `?${chains.map(chain => `chains=${encodeURIComponent(chain)}`).join('&')}`
		: ''
	
	const sortedChains = chains ? [...chains].sort() : []
		
	return useQuery({
		queryKey: ['aggregators-overview', sortedChains.join(',')],
		queryFn: () => fetch(`/api/datasets/aggregators${queryParams}`).then((res) => res.json()),
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		enabled: true
	})
}