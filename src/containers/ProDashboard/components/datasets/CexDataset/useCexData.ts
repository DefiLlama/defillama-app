import { useQuery } from '@tanstack/react-query'

export function useCexData() {
	return useQuery({
		queryKey: ['cex-overview'],
		queryFn: () => fetch('/api/datasets/cex').then((res) => res.json()),
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 5 * 60 * 1000 // 5 minutes
	})
}
