import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { dashboardAPI } from '../services/DashboardAPI'

export function useLikedDashboards() {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const [page, setPage] = useState(1)
	const [limit] = useState(20)

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['liked-dashboards', page, limit],
		queryFn: async () => {
			if (!isAuthenticated) {
				return {
					items: [],
					page: 1,
					perPage: limit,
					totalItems: 0,
					totalPages: 0
				}
			}
			return await dashboardAPI.getLikedDashboards({ page, limit }, authorizedFetch)
		},
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
		dashboards: data?.items || [],
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
