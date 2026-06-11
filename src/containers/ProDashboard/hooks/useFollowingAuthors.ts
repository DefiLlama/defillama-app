import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthContext } from '~/containers/Subscription/auth'
import { type FollowingShelf, dashboardAPI } from '../services/DashboardAPI'

const EMPTY_SHELVES: FollowingShelf[] = []

export function useFollowingAuthors() {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const [page, setPage] = useState(1)
	const limit = 10

	const { data, isLoading, error } = useQuery({
		queryKey: ['pro-dashboard', 'following-authors', page, limit],
		queryFn: () => dashboardAPI.getFollowingAuthors({ page, limit }, authorizedFetch),
		staleTime: 1000 * 60 * 5,
		enabled: isAuthenticated
	})

	return {
		shelves: data?.items ?? EMPTY_SHELVES,
		isLoading,
		error: error as Error | null,
		page,
		totalPages: data?.totalPages || 1,
		totalItems: data?.totalItems || 0,
		goToPage: setPage
	}
}
