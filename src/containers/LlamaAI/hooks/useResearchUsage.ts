import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { ResearchUsage } from './useChatHistory'
import { SESSIONS_QUERY_KEY, type SessionListData } from './useSessionList'

export function useResearchUsage() {
	const { user } = useAuthContext()
	const queryClient = useQueryClient()

	const decrementResearchUsage = useCallback(() => {
		if (!user) return

		queryClient.setQueryData([SESSIONS_QUERY_KEY, user.id], (old: SessionListData | undefined) => {
			if (!old?.usage) return old ?? { sessions: [], usage: null }
			return {
				...old,
				usage: {
					...old.usage,
					remainingUsage: Math.max(0, old.usage.remainingUsage - 1)
				}
			}
		})
	}, [user, queryClient])

	// Get current usage from cache
	const getResearchUsage = useCallback((): ResearchUsage | null => {
		if (!user) return null
		const data = queryClient.getQueryData([SESSIONS_QUERY_KEY, user.id]) as SessionListData | undefined
		return data?.usage ?? null
	}, [user, queryClient])

	return {
		decrementResearchUsage,
		getResearchUsage
	}
}
