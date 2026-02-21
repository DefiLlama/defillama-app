import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
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

interface NotificationPreference {
	id: string
	userId: string
	settings: NotificationSettings
	frequency: 'daily' | 'weekly'
	active: boolean
	created: string
	updated: string
}

interface SaveNotificationPreferencesRequest {
	portfolioName: string
	settings: NotificationSettings
	frequency: 'daily' | 'weekly'
}

const parseJsonSafely = async <T = unknown>(response: Response): Promise<T | null> => {
	const parsed = await response.json().catch(() => null)
	return parsed as T | null
}

const getUserFacingErrorMessage = (error: unknown, fallbackMessage: string): string => {
	if (!(error instanceof Error)) return fallbackMessage
	if (!error.message.startsWith('[HTTP] [error]')) return error.message || fallbackMessage
	const colonIndex = error.message.indexOf(':')
	if (colonIndex === -1) return fallbackMessage
	const details = error.message.slice(colonIndex + 1).trim()
	return details || fallbackMessage
}

export const useEmailNotifications = (portfolioName?: string) => {
	const { authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()
	const isAuthenticated = !!pb.authStore.token

	const {
		data: preferences,
		isLoading,
		isFetching,
		error
	} = useQuery<NotificationPreference | null>({
		queryKey: ['notifications', 'preferences', pb.authStore.record?.id, portfolioName],
		queryFn: async () => {
			if (!isAuthenticated || !portfolioName) {
				return null
			}

			const url = new URL(`${AUTH_SERVER}/watchlist/preferences`)
			url.searchParams.append('portfolioName', portfolioName)

			const response = await authorizedFetch(url.toString(), {
				method: 'GET'
			})

			if (!response) throw new Error('Not authenticated')

			if (!response.ok) {
				if (response.status === 404) {
					return null
				}
				if (response.status === 401) {
					throw new Error('Unauthorized')
				}
			}
			await handleSimpleFetchResponse(response)

			const data = await parseJsonSafely<{ preferences?: NotificationPreference | null }>(response)
			if (!data || data.preferences == null) {
				return null
			}
			return data.preferences
		},
		enabled: isAuthenticated && !!portfolioName,
		staleTime: 1000 * 60 * 5, // 5 minutes
		refetchOnWindowFocus: false,
		retry: 0
	})

	const savePreferences = useMutation<NotificationPreference, Error, SaveNotificationPreferencesRequest>({
		mutationFn: async (preferencesData) => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/watchlist/preferences`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(preferencesData)
				},
				true
			)

			if (!response) throw new Error('Not authenticated')

			await handleSimpleFetchResponse(response)

			const data = await response.json()
			return data.preferences
		},
		onSuccess: (data, variables) => {
			queryClient.setQueryData(['notifications', 'preferences', pb.authStore.record?.id, variables.portfolioName], data)
			toast.success('Notification preferences saved successfully')
		},
		onError: (error) => {
			console.error('Error saving notification preferences:', error)
			toast.error(getUserFacingErrorMessage(error, 'Failed to save notification preferences'))
		}
	})

	const updateStatus = useMutation<void, Error, { portfolioName: string; active: boolean }>({
		mutationFn: async ({ portfolioName: portfolioNameToUpdate, active }) => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/watchlist/status`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ portfolioName: portfolioNameToUpdate, active })
				},
				true
			)

			if (!response) throw new Error('Not authenticated')

			await handleSimpleFetchResponse(response)
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['notifications', 'preferences', pb.authStore.record?.id, variables.portfolioName]
			})
			toast.success(variables.active ? 'Notification preferences enabled' : 'Notification preferences disabled')
		},
		onError: (error) => {
			console.error('Error updating notification status:', error)
			toast.error(getUserFacingErrorMessage(error, 'Failed to update notification status'))
		}
	})

	const deletePreferences = useMutation<void, Error, { portfolioName: string }>({
		mutationFn: async ({ portfolioName: portfolioNameToDelete }) => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const url = new URL(`${AUTH_SERVER}/watchlist/preferences`)
			url.searchParams.append('portfolioName', portfolioNameToDelete)

			const response = await authorizedFetch(
				url.toString(),
				{
					method: 'DELETE'
				},
				true
			)

			if (!response) throw new Error('Not authenticated')

			await handleSimpleFetchResponse(response)
		},
		onSuccess: (_, variables) => {
			queryClient.setQueryData(['notifications', 'preferences', pb.authStore.record?.id, variables.portfolioName], null)
			toast.success('Notification preferences deleted')
		},
		onError: (error) => {
			console.error('Error deleting notification preferences:', error)
			toast.error(getUserFacingErrorMessage(error, 'Failed to delete notifications'))
		}
	})

	return {
		preferences,
		isLoading,
		isFetching,
		error,
		savePreferences: savePreferences.mutateAsync,
		isSaving: savePreferences.isPending,
		updateStatus: updateStatus.mutateAsync,
		isUpdatingStatus: updateStatus.isPending,
		deletePreferences: deletePreferences.mutateAsync,
		isDeleting: deletePreferences.isPending
	}
}
