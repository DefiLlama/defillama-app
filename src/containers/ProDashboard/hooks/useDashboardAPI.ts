import { useCallback } from 'react'
import { useRouter } from 'next/router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Dashboard, dashboardAPI } from '../services/DashboardAPI'
import { DashboardItemConfig } from '../types'
import { TimePeriod } from '../ProDashboardAPIContext'

export function useDashboardAPI() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated } = useAuthContext()

	// Query for fetching dashboards list
	const {
		data: dashboards = [],
		isLoading: isLoadingDashboards,
		error: dashboardsError
	} = useQuery({
		queryKey: ['dashboards'],
		queryFn: async () => {
			if (!isAuthenticated) return []
			try {
				return await dashboardAPI.listDashboards(authorizedFetch)
			} catch (error) {
				console.error('Failed to load dashboards:', error)
				return []
			}
		},
		enabled: isAuthenticated
	})

	const createDashboardMutation = useMutation({
		mutationFn: async (data: {
			items: DashboardItemConfig[]
			dashboardName: string
			timePeriod?: TimePeriod
			visibility?: 'private' | 'public'
			tags?: string[]
			description?: string
		}) => {
			return await dashboardAPI.createDashboard(data, authorizedFetch)
		},
		onSuccess: (dashboard) => {
			router.push(`/pro/${dashboard.id}`)
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to create dashboard')
		}
	})

	const updateDashboardMutation = useMutation({
		mutationFn: async ({
			id,
			data
		}: {
			id: string
			data: {
				items: DashboardItemConfig[]
				dashboardName: string
				timePeriod?: TimePeriod
				visibility?: 'private' | 'public'
				tags?: string[]
				aiGenerated?: Record<string, any> | null
				description?: string
			}
		}) => {
			return await dashboardAPI.updateDashboard(id, data, authorizedFetch)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dashboards'] })
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to save dashboard')
		}
	})

	// Mutation to delete dashboard
	const deleteDashboardMutation = useMutation({
		mutationFn: async (id: string) => {
			return await dashboardAPI.deleteDashboard(id, authorizedFetch)
		},
		onSuccess: (_, deletedId) => {
			queryClient.invalidateQueries({ queryKey: ['dashboards'] })
			toast.success('Dashboard deleted successfully')
			// Navigate away if current dashboard was deleted
			const currentDashboardId = router.query.dashboardId
			if (currentDashboardId === deletedId) {
				router.push('/pro')
			}
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to delete dashboard')
		}
	})

	const loadDashboard = useCallback(
		async (id: string) => {
			try {
				const dashboard = await dashboardAPI.getDashboard(id, isAuthenticated ? authorizedFetch : undefined)
				return dashboard
			} catch (error: any) {
				console.error('Failed to load dashboard:', error)
				return null
			}
		},
		[isAuthenticated, authorizedFetch]
	)

	// Navigate to a dashboard
	const navigateToDashboard = useCallback(
		(id: string) => {
			router.push(`/pro/${id}`)
		},
		[router]
	)

	// Delete dashboard with confirmation
	const deleteDashboardWithConfirmation = useCallback(
		async (id: string) => {
			if (confirm('Are you sure you want to delete this dashboard?')) {
				await deleteDashboardMutation.mutateAsync(id)
			}
		},
		[deleteDashboardMutation]
	)

	return {
		// Data
		dashboards,
		isLoadingDashboards,
		dashboardsError,

		// Mutations
		createDashboard: createDashboardMutation.mutateAsync,
		updateDashboard: updateDashboardMutation.mutateAsync,
		deleteDashboard: deleteDashboardWithConfirmation,
		isCreating: createDashboardMutation.isPending,
		isUpdating: updateDashboardMutation.isPending,
		isDeleting: deleteDashboardMutation.isPending,

		// Actions
		loadDashboard,
		navigateToDashboard
	}
}
