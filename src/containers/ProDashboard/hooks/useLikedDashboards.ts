import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Dashboard, dashboardAPI } from '../services/DashboardAPI'

const EMPTY_DASHBOARDS: Dashboard[] = []

export function useLikedDashboards() {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const [page, setPage] = useState(1)
	const [limit] = useState(20)

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['liked-dashboards', page, limit],
		queryFn: async () => {
			if (!isAuthenticated) {
				return {
					items: EMPTY_DASHBOARDS,
					page: 1,
					perPage: limit,
					totalItems: 0,
					totalPages: 0
				}
			}
			return await dashboardAPI.getLikedDashboards({ page, limit }, authorizedFetch)
		},
		staleTime: 1000 * 60 * 5,
		enabled: isAuthenticated
	})

	const goToPage = useCallback((newPage: number) => {
		setPage(newPage)
	}, [])

	const nextPage = useCallback(() => {
		if (data && page < data.totalPages) {
			setPage(page + 1)
		}
	}, [data, page])

	const prevPage = useCallback(() => {
		if (page > 1) {
			setPage(page - 1)
		}
	}, [page])

	return {
		dashboards: data?.items ?? EMPTY_DASHBOARDS,
		isLoading,
		error: error as Error | null,
		page,
		totalPages: data?.totalPages || 1,
		totalItems: data?.totalItems || 0,
		perPage: data?.perPage || limit,
		goToPage,
		nextPage,
		prevPage,
		refetch
	}
}
