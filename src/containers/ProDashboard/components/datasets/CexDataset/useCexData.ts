import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export function useCexData() {
	return useQuery({
		queryKey: ['cex-overview'],
		queryFn: () => fetchJson('/api/datasets/cex'),
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 5 * 60 * 1000 // 5 minutes
	})
}
