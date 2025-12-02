import { useQuery } from '@tanstack/react-query'
import { AUTH_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'

export interface FeatureFlags {
	llamaai?: boolean
	is_llama?: boolean
	[key: string]: boolean | undefined
}

interface UseFeatureFlagsReturn {
	flags: FeatureFlags
	loading: boolean
	error: string | null
	refetch: () => void
	userLoading: boolean
}

async function fetchFeatureFlags(authorizedFetch: any): Promise<FeatureFlags> {
	const response = await authorizedFetch(`${AUTH_SERVER}/user/feature-flags`)

	if (!response) {
		throw new Error('Failed to fetch feature flags')
	}

	if (!response.ok) {
		if (response.status === 404) {
			// Return empty flags if user has no feature flags configured
			return {}
		}
		throw new Error(`HTTP ${response.status}: ${response.statusText}`)
	}

	const data: FeatureFlags = await response.json()
	return data
}

export function useFeatureFlags(): UseFeatureFlagsReturn {
	const {
		isAuthenticated,
		authorizedFetch,
		user,
		loaders: { userLoading }
	} = useAuthContext()

	const {
		data: flags = {},
		isLoading,
		error,
		refetch
	} = useQuery({
		queryKey: ['feature-flags', user?.id],
		queryFn: () => fetchFeatureFlags(authorizedFetch),
		enabled: isAuthenticated && !!user && !!authorizedFetch,
		staleTime: 30 * 1000,
		gcTime: 60 * 60 * 1000,
		refetchOnMount: false,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		retry: (failureCount, error: any) => {
			if (error?.message?.includes('404') || error?.message?.includes('401')) {
				return false
			}
			return failureCount < 2
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	})

	return {
		flags,
		loading: isLoading,
		userLoading,
		error: error?.message || null,
		refetch
	}
}
