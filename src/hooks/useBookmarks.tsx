import { useCallback, useEffect, useRef } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { readAppStorage, useWatchlistManager } from '~/contexts/LocalStorage'
import { useDebouncedCallback } from './useDebounce'
import { useUserConfig } from './useUserConfig'

const SYNC_DEBOUNCE_MS = 1000

export function useBookmarks(type: 'defi' | 'yields' | 'chains') {
	const { isAuthenticated } = useAuthContext()
	const { saveUserConfig, isLoadingConfig } = useUserConfig()
	const localWatchlist = useWatchlistManager(type)
	const isSyncing = useRef(false)

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

	const debouncedSyncToServer = useDebouncedCallback(() => {
		void syncToServer()
	}, SYNC_DEBOUNCE_MS)

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
