import { useQuery } from '@tanstack/react-query'
import { getTopAuthors } from '~/containers/Authors/api'
import type { TopAuthorEntry } from '~/containers/Authors/types'

const EMPTY_AUTHORS: TopAuthorEntry[] = []

export function useTopAuthors(limit = 12) {
	const { data, isLoading } = useQuery({
		queryKey: ['pro-dashboard', 'top-authors', limit],
		queryFn: () => getTopAuthors(limit),
		staleTime: 1000 * 60 * 5,
		retry: 1
	})

	return { authors: data ?? EMPTY_AUTHORS, isLoading }
}
