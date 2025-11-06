import { useCallback, useEffect, useMemo, useRef } from 'react'
import debounce from 'lodash/debounce'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useWatchlistManager } from '~/contexts/LocalStorage'
import { slug } from '~/utils'
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
					console.error('Failed to sync watchlist to server:', error)
				} finally {
					setTimeout(() => {
						isSyncing.current = false
					}, 100)
				}
			}, SYNC_DEBOUNCE_MS),
		[isAuthenticated, saveUserConfig]
	)

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
			Object.keys(serverWatchlist).forEach((portfolio) => {
				if (!mergedWatchlist[portfolio]) {
					mergedWatchlist[portfolio] = {}
				}
				mergedWatchlist[portfolio] = {
					...mergedWatchlist[portfolio],
					...serverWatchlist[portfolio]
				}
			})

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
			if (isAuthenticated) {
				syncToServer()
			}
		},
		[localWatchlist, isAuthenticated, syncToServer]
	)

	const removeProtocol = useCallback(
		(name: string) => {
			localWatchlist.removeProtocol(name)
			if (isAuthenticated) {
				syncToServer()
			}
		},
		[localWatchlist, isAuthenticated, syncToServer]
	)

	const addPortfolio = useCallback(
		(name: string) => {
			localWatchlist.addPortfolio(name)
			if (isAuthenticated) {
				syncToServer()
			}
		},
		[localWatchlist, isAuthenticated, syncToServer]
	)

	const removePortfolio = useCallback(
		(name: string) => {
			localWatchlist.removePortfolio(name)
			if (isAuthenticated) {
				syncToServer()
			}
		},
		[localWatchlist, isAuthenticated, syncToServer]
	)

	const setSelectedPortfolio = useCallback(
		(name: string) => {
			localWatchlist.setSelectedPortfolio(name)
			if (isAuthenticated) {
				syncToServer()
			}
		},
		[localWatchlist, isAuthenticated, syncToServer]
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
