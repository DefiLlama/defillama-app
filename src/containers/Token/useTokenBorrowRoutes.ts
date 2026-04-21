import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import type { TokenBorrowRoutesResponse } from './tokenBorrowRoutes.types'

async function fetchTokenBorrowRoutes(tokenSymbol: string): Promise<TokenBorrowRoutesResponse> {
	return fetchJson<TokenBorrowRoutesResponse>(
		`/api/datasets/yields-token-borrow-routes?token=${encodeURIComponent(tokenSymbol)}`
	)
}

export function useTokenBorrowRoutes(tokenSymbol: string, initialData?: TokenBorrowRoutesResponse) {
	return useQuery({
		queryKey: ['token-borrow-routes', 'token-page', tokenSymbol],
		queryFn: () => fetchTokenBorrowRoutes(tokenSymbol),
		initialData,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(tokenSymbol)
	})
}
