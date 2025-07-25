import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { AUTH_SERVER } from '../constants'
import { useAuthContext } from '../containers/Subscribtion/auth'
const USER_CONFIG_QUERY_KEY = ['userConfig']

type UserConfig = Record<string, any>

export function useUserConfig() {
	const { isAuthenticated, authorizedFetch, user } = useAuthContext()
	const queryClient = useQueryClient()

	const fetchConfig = useCallback(async (): Promise<UserConfig | null> => {
		if (!isAuthenticated || !authorizedFetch) {
			return null
		}
		try {
			const response = await authorizedFetch(`${AUTH_SERVER}/user/config`)
			if (response?.ok) {
				const config = await response.json()
				return config as UserConfig
			}
			if (response?.status === 404) {
				return {}
			}
		} catch (error) {
			return null
		}
	}, [isAuthenticated, authorizedFetch])

	const saveConfig = useCallback(
		async (config: UserConfig): Promise<UserConfig> => {
			if (!isAuthenticated || !authorizedFetch) {
				return
			}
			try {
				const response = await authorizedFetch(`${AUTH_SERVER}/user/config`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(config)
				})

				return config
			} catch (error) {
				return
			}
		},
		[isAuthenticated, authorizedFetch]
	)

	const {
		data: userConfig,
		isLoading: isLoadingConfig,
		isError: isErrorLoadingConfig,
		refetch: refetchConfig
	} = useQuery<UserConfig | null>({
		queryKey: USER_CONFIG_QUERY_KEY,
		queryFn: fetchConfig,
		enabled: isAuthenticated,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: true
	})

	const mutation = useMutation<UserConfig, Error, UserConfig>({
		mutationFn: saveConfig,
		onSuccess: (savedConfig) => {
			queryClient.setQueryData(USER_CONFIG_QUERY_KEY, savedConfig)
		},
		onError: (error) => {
			console.error('Mutation failed:', error.message)
		}
	})

	return {
		userConfig,
		isLoadingConfig,
		isErrorLoadingConfig,
		saveUserConfig: mutation.mutateAsync,
		isSavingConfig: mutation.isPending,
		isErrorSavingConfig: mutation.isError,
		refetchConfig
	}
}
