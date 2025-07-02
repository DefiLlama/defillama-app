import { useQuery } from '@tanstack/react-query'

export function useOptionsData(chains?: string[]) {
	const queryParams = chains && chains.length > 0 
		? `?${chains.map(chain => `chains=${encodeURIComponent(chain)}`).join('&')}`
		: ''
	
	const sortedChains = chains ? [...chains].sort() : []
		
	return useQuery({
		queryKey: ['options-overview', sortedChains.join(',')],
		queryFn: () => fetch(`/api/datasets/options${queryParams}`).then((res) => res.json()),
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		enabled: true
	})
}