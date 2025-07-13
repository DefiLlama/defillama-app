import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

interface TokenOption {
	value: string
	label: string
	logo?: string
}

export function useTokenSearch(searchQuery: string) {
	return useQuery<TokenOption[]>({
		queryKey: ['token-search', searchQuery],
		queryFn: async () => fetchJson(`/api/tokens/search?query=${encodeURIComponent(searchQuery || '')}`),
		staleTime: 5 * 60 * 1000,
		placeholderData: []
	})
}
