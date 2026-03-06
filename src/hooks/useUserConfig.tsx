import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useEffectEvent, useRef } from 'react'
import { AUTH_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import {
	readAppStorage,
	readAppStorageRaw,
	subscribeToLocalStorage,
	THEME_SYNC_KEY,
	WATCHLIST_KEYS,
	type AppStorage,
	type WatchlistStore,
	writeAppStorage
} from '~/contexts/LocalStorage'
import { subscribeToStorageKey } from '~/contexts/localStorageStore'
import { useDebouncedCallback } from './useDebounce'

const USER_CONFIG_QUERY_KEY = ['user-config']
const SYNC_DEBOUNCE_MS = 2000
type UserConfig = Partial<AppStorage>

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeWatchlistStore = (value: unknown): WatchlistStore | null => {
	if (!isRecord(value)) return null

	const normalized: WatchlistStore = {}
	let hasNormalizedPortfolios = false
	for (const [portfolio, protocols] of Object.entries(value)) {
		if (!isRecord(protocols)) continue
		const normalizedProtocols: Record<string, string> = {}
		for (const [slug, name] of Object.entries(protocols)) {
			if (typeof name === 'string') {
				normalizedProtocols[slug] = name
			}
		}
		let hasNormalizedProtocols = false
		for (const _protocol in normalizedProtocols) {
			hasNormalizedProtocols = true
			break
		}
		if (hasNormalizedProtocols) {
			normalized[portfolio] = normalizedProtocols
			hasNormalizedPortfolios = true
		}
	}

	return hasNormalizedPortfolios ? normalized : null
}

const mergeWatchlists = (local: WatchlistStore | null, remote: WatchlistStore | null): WatchlistStore | null => {
	if (!local && !remote) return null
	if (!local) return remote
	if (!remote) return local

	const merged: WatchlistStore = { ...remote }
	for (const [portfolio, protocols] of Object.entries(local)) {
		merged[portfolio] = { ...(remote[portfolio] ?? {}), ...protocols }
	}

	return merged
}

const mergeSelectedPortfolio = (local: unknown, remote: unknown): string | undefined => {
	if (typeof local === 'string' && local.length > 0) return local
	if (typeof remote === 'string' && remote.length > 0) return remote
	return undefined
}

export function useUserConfig() {
	const { isAuthenticated, authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const isSyncingRef = useRef(false)
	const hasInitializedRef = useRef(false)
	const lastSyncedRawRef = useRef<string | null>(null)

	const fetchConfig = useCallback(async (): Promise<UserConfig | null> => {
		if (!isAuthenticated || !authorizedFetch) return null
		const processResponse = async (): Promise<UserConfig | null> => {
			const response = await authorizedFetch(`${AUTH_SERVER}/user/config`)
			if (response == null) {
				return null
			}
			if (response.ok) {
				const config: UserConfig = await response.json()

				const hasConfig = isRecord(config) && Object.keys(config).length > 0
				if (hasConfig && !hasInitializedRef.current) {
					isSyncingRef.current = true

					const localSettings = readAppStorage()
					const localSettingsRaw = readAppStorageRaw()
					const mergedSettings: AppStorage = { ...localSettings, ...config }

					const watchlistKeys = [
						WATCHLIST_KEYS.DEFI_WATCHLIST,
						WATCHLIST_KEYS.YIELDS_WATCHLIST,
						WATCHLIST_KEYS.CHAINS_WATCHLIST
					] as const

					for (const key of watchlistKeys) {
						const merged = mergeWatchlists(
							normalizeWatchlistStore(localSettings[key]),
							normalizeWatchlistStore(config[key])
						)
						if (merged) {
							mergedSettings[key] = merged
						}
					}

					const selectedKeys = [
						WATCHLIST_KEYS.DEFI_SELECTED_PORTFOLIO,
						WATCHLIST_KEYS.YIELDS_SELECTED_PORTFOLIO,
						WATCHLIST_KEYS.CHAINS_SELECTED_PORTFOLIO
					] as const

					for (const key of selectedKeys) {
						const mergedSelected = mergeSelectedPortfolio(localSettings[key], config[key])
						if (mergedSelected) {
							mergedSettings[key] = mergedSelected
						}
					}

					const mergedRaw = JSON.stringify(mergedSettings)
					if (mergedRaw !== localSettingsRaw) {
						writeAppStorage(mergedSettings)
					}
					lastSyncedRawRef.current = mergedRaw
					hasInitializedRef.current = true

					setTimeout(() => {
						isSyncingRef.current = false
					}, 100)
				} else if (!hasConfig) {
					hasInitializedRef.current = true
				}

				return config as UserConfig
			}
			if (response.status === 404) {
				hasInitializedRef.current = true
				return {}
			}

			return null
		}
		try {
			return await processResponse()
		} catch (error) {
			console.error('Failed to fetch/process user config:', error)
			return null
		}
	}, [isAuthenticated, authorizedFetch])

	const saveConfig = useCallback(
		async (config: UserConfig): Promise<UserConfig | undefined> => {
			if (!isAuthenticated || !authorizedFetch) {
				return undefined
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
				return undefined
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
		refetchOnWindowFocus: true
	})

	const {
		mutateAsync: saveConfigAsync,
		isPending: isSavingConfig,
		isError: isErrorSavingConfig
	} = useMutation<UserConfig | undefined, Error, UserConfig>({
		mutationFn: saveConfig,
		onSuccess: (savedConfig) => {
			queryClient.setQueryData(USER_CONFIG_QUERY_KEY, savedConfig)
		},
		onError: (error) => {
			console.log('Mutation failed:', error.message)
		}
	})

	const saveConfigAsyncRef = useRef(saveConfigAsync)
	useEffect(() => {
		saveConfigAsyncRef.current = saveConfigAsync
	})

	const syncSettings = useDebouncedCallback(async () => {
		try {
			const currentSettings = readAppStorageRaw()
			if (!currentSettings) return
			if (currentSettings === lastSyncedRawRef.current) return

			await saveConfigAsyncRef.current(readAppStorage())
			lastSyncedRawRef.current = currentSettings
		} catch (error) {
			console.log('Failed to sync settings:', error)
		}
	}, SYNC_DEBOUNCE_MS)

	// useEffectEvent ensures we call the latest syncSettings without re-subscribing listeners
	const onStorageChange = useEffectEvent(() => {
		if (isSyncingRef.current || !hasInitializedRef.current) {
			return
		}
		syncSettings()
	})

	useEffect(() => {
		if (!isAuthenticated) {
			hasInitializedRef.current = false
			lastSyncedRawRef.current = null
			syncSettings.cancel()
			return
		}

		const unsubscribeLocalStorage = subscribeToLocalStorage(onStorageChange)
		const unsubscribeTheme = subscribeToStorageKey(THEME_SYNC_KEY, onStorageChange)

		return () => {
			unsubscribeLocalStorage()
			unsubscribeTheme()
			syncSettings.cancel()
		}
	}, [isAuthenticated, syncSettings])

	return {
		userConfig,
		isLoadingConfig,
		isErrorLoadingConfig,
		saveUserConfig: saveConfigAsync,
		isSavingConfig,
		isErrorSavingConfig,
		refetchConfig
	}
}
