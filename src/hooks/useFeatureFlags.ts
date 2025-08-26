import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'

export interface FeatureFlags {
	'dashboard-gen'?: boolean
	[key: string]: boolean | undefined
}

interface UseFeatureFlagsReturn {
	flags: FeatureFlags
	loading: boolean
	error: string | null
	refetch: () => void
}

const FEATURE_FLAGS_CACHE_KEY = 'feature-flags'
const FEATURE_FLAGS_TIMESTAMP_KEY = 'feature-flags-timestamp'
const CACHE_DURATION = 60 * 60 * 1000

export function useFeatureFlags(): UseFeatureFlagsReturn {
	const [flags, setFlags] = useState<FeatureFlags>({})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const { isAuthenticated, authorizedFetch, user } = useAuthContext()

	const getCachedFlags = useCallback((): FeatureFlags | null => {
		try {
			const cachedFlags = localStorage.getItem(FEATURE_FLAGS_CACHE_KEY)
			const cachedTimestamp = localStorage.getItem(FEATURE_FLAGS_TIMESTAMP_KEY)
			
			if (!cachedFlags || !cachedTimestamp) {
				return null
			}

			const timestamp = parseInt(cachedTimestamp, 10)
			const now = Date.now()

			if (now - timestamp > CACHE_DURATION) {
				localStorage.removeItem(FEATURE_FLAGS_CACHE_KEY)
				localStorage.removeItem(FEATURE_FLAGS_TIMESTAMP_KEY)
				return null
			}

			return JSON.parse(cachedFlags)
		} catch (error) {
			console.error('Error reading cached feature flags:', error)
			return null
		}
	}, [])

	const setCachedFlags = useCallback((newFlags: FeatureFlags) => {
		try {
			localStorage.setItem(FEATURE_FLAGS_CACHE_KEY, JSON.stringify(newFlags))
			localStorage.setItem(FEATURE_FLAGS_TIMESTAMP_KEY, Date.now().toString())
		} catch (error) {
			console.error('Error caching feature flags:', error)
		}
	}, [])

	const fetchFeatureFlags = useCallback(async () => {
		if (!isAuthenticated || !user) {
			setFlags({})
			setLoading(false)
			setError(null)
			return
		}

		try {
			setError(null)
			
			const cachedFlags = getCachedFlags()
			if (cachedFlags) {
				setFlags(cachedFlags)
				setLoading(false)
				return
			}

			const response = await authorizedFetch('https://auth.llama.fi/user/feature-flags')
			
			if (!response) {
				throw new Error('Failed to fetch feature flags')
			}

			if (!response.ok) {
				if (response.status === 404) {
					const defaultFlags: FeatureFlags = {}
					setFlags(defaultFlags)
					setCachedFlags(defaultFlags)
					setLoading(false)
					return
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const data: FeatureFlags = await response.json()
			setFlags(data)
			setCachedFlags(data)
		} catch (err) {
			console.error('Error fetching feature flags:', err)
			setError(err instanceof Error ? err.message : 'Failed to load feature flags')
			const cachedFlags = getCachedFlags()
			if (!cachedFlags) {
				setFlags({})
			}
		} finally {
			setLoading(false)
		}
	}, [isAuthenticated, user, authorizedFetch, getCachedFlags, setCachedFlags])

	const refetch = useCallback(() => {
		localStorage.removeItem(FEATURE_FLAGS_CACHE_KEY)
		localStorage.removeItem(FEATURE_FLAGS_TIMESTAMP_KEY)
		setLoading(true)
		fetchFeatureFlags()
	}, [fetchFeatureFlags])

	useEffect(() => {
		fetchFeatureFlags()
	}, [fetchFeatureFlags])

	return {
		flags,
		loading,
		error,
		refetch
	}
}
