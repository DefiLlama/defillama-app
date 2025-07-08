import { useQuery } from '@tanstack/react-query'

export function useChainsData(category?: string) {
	const queryParams = category ? `?category=${encodeURIComponent(category)}` : ''

	return useQuery({
		queryKey: ['chains-overview', category || 'all'],
		queryFn: () => fetch(`/api/datasets/chains${queryParams}`).then((res) => res.json()),
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		enabled: true
	})
}
