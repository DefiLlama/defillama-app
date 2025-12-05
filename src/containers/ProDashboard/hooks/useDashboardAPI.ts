import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useRouter } from 'next/router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { TimePeriod } from '../ProDashboardAPIContext'
import { Dashboard, dashboardAPI } from '../services/DashboardAPI'
import { DashboardItemConfig } from '../types'

function subscribeToLiteDashboardsChange(callback: () => void) {
	window.addEventListener('liteDashboardsChange', callback)
	return () => {
		window.removeEventListener('liteDashboardsChange', callback)
	}
}

export function useGetLiteDashboards() {
	const { authorizedFetch, isAuthenticated, user } = useAuthContext()

	const liteDashboardsInStorage = useSyncExternalStore(
		subscribeToLiteDashboardsChange,
		() => window.localStorage.getItem('lite-dashboards') ?? '[]',
		() => '[]'
	)

	const liteDashboards = useMemo(() => {
		return JSON.parse(liteDashboardsInStorage)
	}, [liteDashboardsInStorage])

	const { isLoading, error } = useQuery({
		queryKey: ['lite-dashboards', user?.id],
		queryFn: async () => {
			if (!isAuthenticated) return []
			try {
				const data = await dashboardAPI.listLiteDashboards(authorizedFetch)
				window.localStorage.setItem('lite-dashboards', JSON.stringify(data))
				return data
			} catch (error) {
				console.log('Failed to load lite dashboards:', error)
				window.localStorage.setItem('lite-dashboards', '[]')

				return []
			} finally {
				window.dispatchEvent(new Event('liteDashboardsChange'))
			}
		},
		staleTime: 24 * 60 * 60 * 1000, // 24 hours
		refetchOnWindowFocus: false,
		enabled: isAuthenticated && !!user?.id
	})

	return {
		data: liteDashboards,
		isLoading: liteDashboards.length === 0 && isLoading,
		error: error as Error | null
	}
}

export function useDashboardAPI() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated, user } = useAuthContext()

	// Query for fetching dashboards list
	const {
		data: dashboards = [],
		isLoading: isLoadingDashboards,
		error: dashboardsError
	} = useQuery({
		queryKey: ['dashboards', user?.id],
		queryFn: async () => {
			if (!isAuthenticated) return []
			try {
				return await dashboardAPI.listDashboards(authorizedFetch)
			} catch (error) {
				console.log('Failed to load dashboards:', error)
				return []
			}
		},
		staleTime: 1000 * 60 * 5,
		enabled: isAuthenticated && !!user?.id
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
			queryClient.invalidateQueries({ queryKey: ['dashboards'] })
			queryClient.invalidateQueries({ queryKey: ['my-dashboards'] })
			queryClient.invalidateQueries({ queryKey: ['lite-dashboards'] })
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
		onSuccess: (dashboard: Dashboard, variables) => {
			queryClient.setQueriesData({ queryKey: ['dashboard', variables.id], exact: false }, dashboard)
			queryClient.invalidateQueries({ queryKey: ['dashboards'] })
			queryClient.invalidateQueries({ queryKey: ['my-dashboards'] })
			queryClient.invalidateQueries({ queryKey: ['lite-dashboards'] })
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
			queryClient.invalidateQueries({ queryKey: ['my-dashboards'] })
			queryClient.invalidateQueries({ queryKey: ['lite-dashboards'] })
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
				console.log('Failed to load dashboard:', error)
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
