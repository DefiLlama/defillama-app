import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useChainsData(category?: string) {
	const queryParams = category ? `?category=${encodeURIComponent(category)}` : ''

	return useQuery({
		queryKey: ['chains-overview', category || 'all'],
		queryFn: () => fetchJson(`/api/datasets/chains${queryParams}`),
		staleTime: Infinity,
		retry: 1
	})
}
