import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { revalidateResearchLanding } from '~/containers/Articles/api'
import { useAuthContext } from '~/containers/Subscription/auth'

export function useResearchLandingRevalidation() {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()

	return useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['research-landing'] })
		void revalidateResearchLanding(authorizedFetch).catch((err) => {
			console.error('Failed to revalidate research landing', err)
		})
	}, [authorizedFetch, queryClient])
}
