import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Dashboard, dashboardAPI } from '../services/DashboardAPI'

interface SearchParams {
	query?: string
	tags?: string[]
	visibility?: 'public' | 'private'
	sortBy?: 'popular' | 'recent' | 'likes' | 'trending'
	timeFrame?: '1d' | '7d' | '30d'
	page?: number
	limit?: number
}

export function useDashboardDiscovery(params: SearchParams) {
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated } = useAuthContext()

	const isSearchMode = params.query || params.tags?.length > 0 ? true : false

	const discoverQuery = useQuery({
		queryKey: ['dashboard-discover', isSearchMode, params.page, params.limit, params.sortBy, params.timeFrame],
		queryFn: async () => {
			if (isSearchMode) return null

			if (params.sortBy) {
				return await dashboardAPI.searchDashboards(
					{
						visibility: 'public',
						sortBy: params.sortBy,
						timeFrame: params.timeFrame,
						page: params.page || 1,
						limit: params.limit || 20
					},
					isAuthenticated ? authorizedFetch : undefined
				)
			}
			return await dashboardAPI.discoverDashboards(
				{
					page: params.page || 1,
					limit: params.limit || 20
				},
				isAuthenticated ? authorizedFetch : undefined
			)
		},
		staleTime: 1000 * 60 * 5,
		enabled: !isSearchMode
	})

	const searchQuery = useQuery({
		queryKey: ['dashboard-search', isSearchMode, params],
		queryFn: async () => {
			if (!isSearchMode) return null
			return await dashboardAPI.searchDashboards(params, isAuthenticated ? authorizedFetch : undefined)
		},
		staleTime: 1000 * 60 * 2,
		enabled: isSearchMode
	})

	const { data: popularTags = [] } = useQuery({
		queryKey: ['popular-tags'],
		queryFn: async () => {
			return [
				'analytics',
				'finance',
				'marketing',
				'hr',
				'sales',
				'kpi',
				'metrics',
				'reporting',
				'real-time',
				'daily',
				'weekly',
				'monthly',
				'revenue',
				'costs',
				'performance',
				'trends',
				'defi',
				'trading',
				'portfolio',
				'risk'
			]
		},
		staleTime: 1000 * 60 * 60
	})

	const likeMutation = useMutation({
		mutationFn: async (dashboardId: string) => {
			if (!isAuthenticated) {
				throw new Error('Please sign in to like dashboards')
			}
			return await dashboardAPI.likeDashboard(dashboardId, authorizedFetch)
		},
		onSuccess: (data, dashboardId) => {
			queryClient.setQueryData(['dashboard-discover'], (oldData: any) => {
				if (!oldData) return oldData
				return {
					...oldData,
					items: oldData.items.map((d: Dashboard) => (d.id === dashboardId ? { ...d, likeCount: data.likeCount } : d))
				}
			})
			queryClient.setQueryData(['dashboard-search'], (oldData: any) => {
				if (!oldData) return oldData
				return {
					...oldData,
					items: oldData.items.map((d: Dashboard) => (d.id === dashboardId ? { ...d, likeCount: data.likeCount } : d))
				}
			})
			toast.success(data.liked ? 'Dashboard liked!' : 'Like removed')
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to update like')
		}
	})

	const activeQuery = isSearchMode ? searchQuery : discoverQuery
	const data = activeQuery.data

	return {
		dashboards: data?.items || [],
		isLoading: activeQuery.isLoading,
		error: activeQuery.error as Error | null,
		totalPages: data?.totalPages || 1,
		totalItems: data?.totalItems || 0,
		currentPage: data?.page || 1,
		popularTags,
		likeDashboard: likeMutation.mutate,
		isLiking: likeMutation.isPending
	}
}
