import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useCexData() {
	return useQuery({
		queryKey: ['pro-dashboard', 'cex-overview'],
		queryFn: () => fetchJson('/api/datasets/cex'),
		staleTime: Infinity,
		retry: 1
	})
}
