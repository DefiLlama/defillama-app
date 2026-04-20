import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import type { TokenStrategiesResponse } from './tokenStrategies.types'

async function fetchTokenStrategies(tokenSymbol: string): Promise<TokenStrategiesResponse> {
	return fetchJson<TokenStrategiesResponse>(
		`/api/datasets/yields-token-strategies?token=${encodeURIComponent(tokenSymbol)}`
	)
}

export function useTokenStrategies(tokenSymbol: string, initialData?: TokenStrategiesResponse) {
	return useQuery({
		queryKey: ['token-strategies', 'token-page', tokenSymbol],
		queryFn: () => fetchTokenStrategies(tokenSymbol),
		initialData,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(tokenSymbol)
	})
}
