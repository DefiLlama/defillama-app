import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useCallback } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { pushShallowQuery } from '~/utils/routerQuery'
import { type Dashboard, dashboardAPI } from '../services/DashboardAPI'

const EMPTY_DASHBOARDS: Dashboard[] = []

interface UseMyDashboardsParams {
	page: number
	limit: number
	enabled?: boolean
}

export function useMyDashboards({ page, limit, enabled = true }: UseMyDashboardsParams) {
	const { authorizedFetch, isAuthenticated, user } = useAuthContext()
	const router = useRouter()

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['my-dashboards', user?.id, page, limit],
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
			return await dashboardAPI.listDashboardsPaginated({ page, limit }, authorizedFetch)
		},
		staleTime: 1000 * 60 * 60,
		enabled: isAuthenticated && enabled
	})

	const goToPage = useCallback(
		(newPage: number) => {
			pushShallowQuery(router, { tab: 'my-dashboards', page: newPage }, '/pro')
		},
		[router]
	)

	return {
		dashboards: data?.items ?? EMPTY_DASHBOARDS,
		isLoading,
		error: error as Error | null,
		page: data?.page || page,
		totalPages: data?.totalPages || 1,
		totalItems: data?.totalItems || 0,
		perPage: data?.perPage || limit,
		refetch,
		goToPage
	}
}
