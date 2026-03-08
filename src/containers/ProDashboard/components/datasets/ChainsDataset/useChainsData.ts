import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import type { ChainsDatasetRow } from './columns'

export function useChainsData(category?: string) {
	const queryParams = category ? `?category=${encodeURIComponent(category)}` : ''

	return useQuery({
		queryKey: ['pro-dashboard', 'chains-overview', category || 'all'],
		queryFn: () => fetchJson<ChainsDatasetRow[]>(`/api/datasets/chains${queryParams}`),
		staleTime: Infinity,
		retry: 1
	})
}
