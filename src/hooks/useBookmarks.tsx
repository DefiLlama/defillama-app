import { useCallback, useEffect, useRef } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { readAppStorage, useWatchlistManager, writeAppStorage } from '~/contexts/LocalStorage'
import { useDebouncedCallback } from './useDebounce'
import { useUserConfig } from './useUserConfig'

const SYNC_DEBOUNCE_MS = 1000

export function useBookmarks(type: 'defi' | 'yields' | 'chains') {
	const { isAuthenticated } = useAuthContext()
	const { userConfig, saveUserConfig, isLoadingConfig } = useUserConfig()
	const localWatchlist = useWatchlistManager(type)
	const isSyncing = useRef(false)
	const hasInitialized = useRef(false)

	const syncToServer = useCallback(async () => {
		if (!isAuthenticated) return
		if (!saveUserConfig) return
		if (isSyncing.current) return

		const parsedData = readAppStorage()
		if (!Object.keys(parsedData).length) return

		try {
			isSyncing.current = true
			await saveUserConfig(parsedData)
			setTimeout(() => {
				isSyncing.current = false
			}, 100)
		} catch (error) {
			console.log('Failed to sync watchlist to server:', error)
			setTimeout(() => {
				isSyncing.current = false
			}, 100)
		}
	}, [isAuthenticated, saveUserConfig])

	// Debounced sync function to save to server
	const debouncedSyncToServer = useDebouncedCallback(() => {
		void syncToServer()
	}, SYNC_DEBOUNCE_MS)

	// Initialize from server config on mount
	useEffect(() => {
		if (!userConfig || hasInitialized.current || isLoadingConfig) return

		const watchlistKey =
			type === 'defi' ? 'DEFI_WATCHLIST' : type === 'chains' ? 'CHAINS_WATCHLIST' : 'YIELDS_WATCHLIST'
		const serverWatchlist = userConfig[watchlistKey]

		let hasServerWatchlist = false
		if (serverWatchlist) {
			for (const _ in serverWatchlist) {
				hasServerWatchlist = true
				break
			}
		}
		if (serverWatchlist && hasServerWatchlist) {
			hasInitialized.current = true
			isSyncing.current = true

			// Merge server data with local data
			const localParsed = readAppStorage()
			const localWatchlistData = localParsed[watchlistKey] || { main: {} }

			// Deep merge watchlists
			const mergedWatchlist = { ...localWatchlistData }
			for (const portfolio in serverWatchlist) {
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
			writeAppStorage(updatedData)

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
			debouncedSyncToServer()
		},
		[localWatchlist, debouncedSyncToServer]
	)

	const removeProtocol = useCallback(
		(name: string) => {
			localWatchlist.removeProtocol(name)
			debouncedSyncToServer()
		},
		[localWatchlist, debouncedSyncToServer]
	)

	const addPortfolio = useCallback(
		(name: string) => {
			localWatchlist.addPortfolio(name)
			debouncedSyncToServer()
		},
		[localWatchlist, debouncedSyncToServer]
	)

	const removePortfolio = useCallback(
		(name: string) => {
			localWatchlist.removePortfolio(name)
			debouncedSyncToServer()
		},
		[localWatchlist, debouncedSyncToServer]
	)

	const setSelectedPortfolio = useCallback(
		(name: string) => {
			localWatchlist.setSelectedPortfolio(name)
			debouncedSyncToServer()
		},
		[localWatchlist, debouncedSyncToServer]
	)

	useEffect(() => {
		return () => {
			debouncedSyncToServer.cancel()
		}
	}, [debouncedSyncToServer])

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
