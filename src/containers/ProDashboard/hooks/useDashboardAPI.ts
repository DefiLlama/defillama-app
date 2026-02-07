import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Router, { useRouter } from 'next/router'
import { useCallback, useSyncExternalStore } from 'react'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { getStorageItem, setStorageItem, subscribeToStorageKey } from '~/contexts/localStorageStore'
import { TimePeriod } from '../ProDashboardAPIContext'
import { Dashboard, dashboardAPI } from '../services/DashboardAPI'
import { DashboardItemConfig } from '../types'

const EMPTY_DASHBOARDS: Dashboard[] = []

export function useGetLiteDashboards() {
	const { authorizedFetch, isAuthenticated, user } = useAuthContext()

	const liteDashboardsInStorage = useSyncExternalStore(
		(callback) => subscribeToStorageKey('lite-dashboards', callback),
		() => getStorageItem('lite-dashboards', '[]') ?? '[]',
		() => '[]'
	)

	const liteDashboards = JSON.parse(liteDashboardsInStorage)

	const { isLoading, error } = useQuery({
		queryKey: ['lite-dashboards', user?.id],
		queryFn: async () => {
			if (!isAuthenticated) return []
			try {
				const data = await dashboardAPI.listLiteDashboards(authorizedFetch)
				setStorageItem('lite-dashboards', JSON.stringify(data))
				return data
			} catch (error) {
				console.log('Failed to load lite dashboards:', error)
				setStorageItem('lite-dashboards', '[]')

				return []
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
		data: dashboardsData,
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
	const dashboards = dashboardsData ?? EMPTY_DASHBOARDS

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
	const navigateToDashboard = (id: string) => {
		Router.push(`/pro/${id}`)
	}

	// Delete dashboard (confirmation handled in UI)
	const deleteDashboardWithConfirmation = useCallback(
		async (id: string) => {
			await deleteDashboardMutation.mutateAsync(id)
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
