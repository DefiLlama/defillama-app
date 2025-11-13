import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import debounce from 'lodash/debounce'
import { AUTH_SERVER } from '../constants'
import { useAuthContext } from '../containers/Subscribtion/auth'

const USER_CONFIG_QUERY_KEY = ['userConfig']
const DEFILLAMA = 'DEFILLAMA'
const SYNC_DEBOUNCE_MS = 2000

type UserConfig = Record<string, any>

export function useUserConfig() {
	const { isAuthenticated, authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const isSyncingRef = useRef(false)
	const hasInitializedRef = useRef(false)

	const fetchConfig = useCallback(async (): Promise<UserConfig | null> => {
		if (!isAuthenticated || !authorizedFetch) {
			return null
		}
		try {
			const response = await authorizedFetch(`${AUTH_SERVER}/user/config`)
			if (response?.ok) {
				const config = await response.json()

				if (Object.keys(config).length > 0) {
					isSyncingRef.current = true

					const currentLocal = localStorage.getItem(DEFILLAMA)
					const localSettings = currentLocal ? JSON.parse(currentLocal) : {}
					const mergedSettings = { ...localSettings, ...config }

					localStorage.setItem(DEFILLAMA, JSON.stringify(mergedSettings))
					window.dispatchEvent(new Event('storage'))

					setTimeout(() => {
						isSyncingRef.current = false
						hasInitializedRef.current = true
					}, 100)
				} else {
					hasInitializedRef.current = true
				}

				return config as UserConfig
			}
			if (response?.status === 404) {
				hasInitializedRef.current = true
				return {}
			}

			return null
		} catch {
			return null
		}
	}, [isAuthenticated, authorizedFetch])

	const saveConfig = useCallback(
		async (config: UserConfig): Promise<UserConfig> => {
			if (!isAuthenticated || !authorizedFetch) {
				return
			}
			try {
				await authorizedFetch(`${AUTH_SERVER}/user/config`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(config)
				})

				return config
			} catch {
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
			console.log('Mutation failed:', error.message)
		}
	})

	const syncSettings = useMemo(
		() =>
			debounce(async () => {
				try {
					const currentSettings = localStorage.getItem(DEFILLAMA)
					if (!currentSettings) return

					const settings = JSON.parse(currentSettings)
					await mutation.mutateAsync(settings)
				} catch (error) {
					console.error('Failed to sync settings:', error)
				}
			}, SYNC_DEBOUNCE_MS),
		[mutation]
	)

	useEffect(() => {
		if (!isAuthenticated) {
			hasInitializedRef.current = false
			syncSettings.cancel()
			return
		}

		const handleStorageChange = () => {
			if (isSyncingRef.current || !hasInitializedRef.current) {
				return
			}
			syncSettings()
		}

		window.addEventListener('storage', handleStorageChange)
		window.addEventListener('themeChange', handleStorageChange)

		return () => {
			window.removeEventListener('storage', handleStorageChange)
			window.removeEventListener('themeChange', handleStorageChange)
			syncSettings.cancel()
		}
	}, [isAuthenticated, syncSettings])

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
