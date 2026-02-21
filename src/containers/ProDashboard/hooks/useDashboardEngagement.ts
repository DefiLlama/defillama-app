import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { type Dashboard, dashboardAPI } from '../services/DashboardAPI'

export function useDashboardEngagement(dashboardId: string | null) {
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated } = useAuthContext()

	const viewMutation = useMutation({
		mutationFn: async () => {
			if (!dashboardId) return
			return await dashboardAPI.viewDashboard(dashboardId, isAuthenticated ? authorizedFetch : undefined)
		},
		onSuccess: (data) => {
			if (!dashboardId || !data) return
			queryClient.setQueriesData(
				{ queryKey: ['pro-dashboard', 'dashboard', dashboardId], exact: false },
				(oldData: Dashboard | undefined) => {
					if (!oldData) return oldData
					return { ...oldData, ...data }
				}
			)
		}
	})

	const likeMutation = useMutation({
		mutationFn: async () => {
			if (!dashboardId) return
			if (!isAuthenticated) {
				toast.error('Please sign in to like dashboards')
				return
			}
			return await dashboardAPI.likeDashboard(dashboardId, authorizedFetch)
		},
		onSuccess: (data) => {
			if (!data) return
			queryClient.setQueriesData(
				{ queryKey: ['pro-dashboard', 'dashboard', dashboardId], exact: false },
				(oldData: Dashboard | undefined) => {
					if (!oldData) return oldData
					return {
						...oldData,
						likeCount: data.likeCount,
						liked: data.liked
					}
				}
			)
			toast.success(data.liked ? 'Dashboard liked!' : 'Like removed')
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to update like')
		}
	})

	return {
		trackView: viewMutation.mutate,
		toggleLike: likeMutation.mutate,
		isLiking: likeMutation.isPending,
		liked: likeMutation.data?.liked,
		likeCount: likeMutation.data?.likeCount
	}
}
