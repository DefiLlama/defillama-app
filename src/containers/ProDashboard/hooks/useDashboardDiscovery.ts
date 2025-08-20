import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Dashboard, dashboardAPI } from '../services/DashboardAPI'

interface SearchParams {
	query?: string
	tags?: string[]
	visibility?: 'public' | 'private'
	sortBy?: 'popular' | 'recent' | 'likes'
	page?: number
	limit?: number
}

export function useDashboardDiscovery() {
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const [searchParams, setSearchParams] = useState<SearchParams>({})
	const [isSearchMode, setIsSearchMode] = useState(false)

	const discoverQuery = useQuery({
		queryKey: ['dashboard-discover', searchParams.page, searchParams.limit, searchParams.sortBy],
		queryFn: async () => {
			if (searchParams.sortBy) {
				return await dashboardAPI.searchDashboards(
					{
						visibility: 'public',
						sortBy: searchParams.sortBy,
						page: searchParams.page || 1,
						limit: searchParams.limit || 20
					},
					isAuthenticated ? authorizedFetch : undefined
				)
			}
			return await dashboardAPI.discoverDashboards(
				{
					page: searchParams.page || 1,
					limit: searchParams.limit || 20
				},
				isAuthenticated ? authorizedFetch : undefined
			)
		},
		enabled: !isSearchMode
	})

	const searchQuery = useQuery({
		queryKey: ['dashboard-search', searchParams],
		queryFn: async () => {
			return await dashboardAPI.searchDashboards(searchParams, isAuthenticated ? authorizedFetch : undefined)
		},
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
		}
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

	const discoverDashboards = useCallback(
		(params: { page?: number; limit?: number; sortBy?: 'popular' | 'recent' | 'likes' }) => {
			setSearchParams(params)
			setIsSearchMode(false)
		},
		[]
	)

	const searchDashboards = useCallback((params: SearchParams) => {
		setSearchParams(params)
		setIsSearchMode(true)
	}, [])

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
		isLiking: likeMutation.isPending,
		discoverDashboards,
		searchDashboards
	}
}
