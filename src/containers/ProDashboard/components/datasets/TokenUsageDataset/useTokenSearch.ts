import { useQuery } from '@tanstack/react-query'

interface TokenOption {
	value: string
	label: string
	logo?: string
}

export function useTokenSearch(searchQuery: string) {
	return useQuery<TokenOption[]>({
		queryKey: ['token-search', searchQuery],
		queryFn: async () => {
			const response = await fetch(`/api/tokens/search?query=${encodeURIComponent(searchQuery || '')}`)
			if (!response.ok) {
				throw new Error('Failed to search tokens')
			}

			return response.json()
		},
		staleTime: 5 * 60 * 1000,
		placeholderData: []
	})
}
