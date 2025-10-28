import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import pb from '~/utils/pocketbase'
import { AUTH_SERVER } from '../constants'

export type MetricType =
	| 'tvl'
	| 'fees'
	| 'revenue'
	| 'holders-revenue'
	| 'volume'
	| 'perps'
	| 'mcap'
	| 'stablecoins'
	| 'fdv'
	| 'ofdv'
	| 'price'

export interface NotificationSettings {
	chains?: Record<string, MetricType[]>
	protocols?: Record<string, MetricType[]>
}

export interface NotificationPreference {
	id: string
	userId: string
	settings: NotificationSettings
	frequency: 'daily' | 'weekly'
	sendTime: string // HH:mm format
	timezone: string // IANA timezone
	active: boolean
	created: string
	updated: string
}

export interface SaveNotificationPreferencesRequest {
	settings: NotificationSettings
	frequency: 'daily' | 'weekly'
	sendTime: string
	timezone: string
}

/**
 * Hook to manage notification preferences for watchlist items
 */
export const useNotifications = () => {
	const { authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()
	const isAuthenticated = !!pb.authStore.token

	// Fetch notification preferences
	const {
		data: preferences,
		isLoading,
		isFetching,
		error
	} = useQuery<NotificationPreference | null>({
		queryKey: ['notification-preferences', pb.authStore.record?.id],
		queryFn: async () => {
			if (!isAuthenticated) {
				return null
			}

			try {
				const response = await authorizedFetch(`${AUTH_SERVER}/notifications/preferences`, {
					method: 'GET'
				})

				if (!response.ok) {
					if (response.status === 404 || response.status === 401) {
						return null
					}
					throw new Error('Failed to fetch notification preferences')
				}

				const data = await response.json()
				return data.preferences || null
			} catch (error) {
				console.error('Error fetching notification preferences:', error)
				return null
			}
		},
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 5, // 5 minutes
		retry: false
	})

	// Save notification preferences
	const savePreferences = useMutation<NotificationPreference, Error, SaveNotificationPreferencesRequest>({
		mutationFn: async (preferencesData) => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/notifications/preferences`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(preferencesData)
				},
				true
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to save notification preferences')
			}

			const data = await response.json()
			return data.preferences
		},
		onSuccess: (data) => {
			queryClient.setQueryData(['notification-preferences', pb.authStore.record?.id], data)
			toast.success('Notification preferences saved successfully')
		},
		onError: (error) => {
			console.error('Error saving notification preferences:', error)
			toast.error(error.message || 'Failed to save notification preferences')
		}
	})

	// Delete notification preferences
	const deletePreferences = useMutation<void, Error>({
		mutationFn: async () => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/notifications/preferences`,
				{
					method: 'DELETE'
				},
				true
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to delete notification preferences')
			}
		},
		onSuccess: () => {
			queryClient.setQueryData(['notification-preferences', pb.authStore.record?.id], null)
			toast.success('Notification preferences disabled')
		},
		onError: (error) => {
			console.error('Error deleting notification preferences:', error)
			toast.error(error.message || 'Failed to disable notifications')
		}
	})

	return {
		preferences,
		isLoading,
		isFetching,
		error,
		savePreferences: savePreferences.mutateAsync,
		isSaving: savePreferences.isPending,
		deletePreferences: deletePreferences.mutateAsync,
		isDeleting: deletePreferences.isPending
	}
}
