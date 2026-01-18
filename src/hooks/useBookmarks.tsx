import debounce from 'lodash/debounce'
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useWatchlistManager } from '~/contexts/LocalStorage'
import { useUserConfig } from './useUserConfig'

const SYNC_DEBOUNCE_MS = 1000

export function useBookmarks(type: 'defi' | 'yields' | 'chains') {
	const { isAuthenticated } = useAuthContext()
	const { userConfig, saveUserConfig, isLoadingConfig } = useUserConfig()
	const localWatchlist = useWatchlistManager(type)
	const isSyncing = useRef(false)
	const hasInitialized = useRef(false)

	// Debounced sync function to save to server
	const syncToServer = useMemo(
		() =>
			debounce(async () => {
				if (!isAuthenticated || !saveUserConfig || isSyncing.current) return

				try {
					isSyncing.current = true
					// Get current localStorage data
					const localData = localStorage.getItem('DEFILLAMA')
					if (!localData) return

					const parsed = JSON.parse(localData)
					await saveUserConfig(parsed)
				} catch (error) {
					console.log('Failed to sync watchlist to server:', error)
				} finally {
					setTimeout(() => {
						isSyncing.current = false
					}, 100)
				}
			}, SYNC_DEBOUNCE_MS),
		[isAuthenticated, saveUserConfig]
	)

	// useEffectEvent to trigger sync - always calls latest syncToServer without being a dependency
	const onSync = useEffectEvent(() => {
		if (isAuthenticated) {
			syncToServer()
		}
	})

	// Initialize from server config on mount
	useEffect(() => {
		if (!userConfig || hasInitialized.current || isLoadingConfig) return

		const watchlistKey =
			type === 'defi' ? 'DEFI_WATCHLIST' : type === 'chains' ? 'CHAINS_WATCHLIST' : 'YIELDS_WATCHLIST'
		const serverWatchlist = userConfig[watchlistKey]

		if (serverWatchlist && Object.keys(serverWatchlist).length > 0) {
			hasInitialized.current = true
			isSyncing.current = true

			// Merge server data with local data
			const localData = localStorage.getItem('DEFILLAMA')
			const localParsed = localData ? JSON.parse(localData) : {}
			const localWatchlistData = localParsed[watchlistKey] || { main: {} }

			// Deep merge watchlists
			const mergedWatchlist = { ...localWatchlistData }
			for (const portfolio of Object.keys(serverWatchlist)) {
				if (!mergedWatchlist[portfolio]) {
					mergedWatchlist[portfolio] = {}
				}
				mergedWatchlist[portfolio] = {
					...mergedWatchlist[portfolio],
					...serverWatchlist[portfolio]
				}
			}

			// Update localStorage with merged data
			const updatedData = {
				...localParsed,
				[watchlistKey]: mergedWatchlist
			}
			localStorage.setItem('DEFILLAMA', JSON.stringify(updatedData))
			window.dispatchEvent(new Event('storage'))

			setTimeout(() => {
				isSyncing.current = false
			}, 100)
		} else {
			hasInitialized.current = true
		}
	}, [userConfig, isLoadingConfig, type])

	const addProtocol = useCallback(
		(name: string) => {
			localWatchlist.addProtocol(name)
			onSync()
		},
		[localWatchlist]
	)

	const removeProtocol = useCallback(
		(name: string) => {
			localWatchlist.removeProtocol(name)
			onSync()
		},
		[localWatchlist]
	)

	const addPortfolio = useCallback(
		(name: string) => {
			localWatchlist.addPortfolio(name)
			onSync()
		},
		[localWatchlist]
	)

	const removePortfolio = useCallback(
		(name: string) => {
			localWatchlist.removePortfolio(name)
			onSync()
		},
		[localWatchlist]
	)

	const setSelectedPortfolio = useCallback(
		(name: string) => {
			localWatchlist.setSelectedPortfolio(name)
			onSync()
		},
		[localWatchlist]
	)

	useEffect(() => {
		return () => {
			syncToServer.cancel()
		}
	}, [syncToServer])

	return {
		...localWatchlist,
		addProtocol,
		removeProtocol,
		addPortfolio,
		removePortfolio,
		setSelectedPortfolio,
		isLoadingWatchlist: isLoadingConfig
	}
}
