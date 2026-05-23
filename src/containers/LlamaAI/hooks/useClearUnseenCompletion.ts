import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
	SESSIONS_QUERY_KEY,
	type SessionListInfiniteData,
	updateSessionInInfiniteData
} from '~/containers/LlamaAI/hooks/sessionListCache'
import { projectSessionsKey } from '~/containers/LlamaAI/projects/queryKeys'
import type { ProjectChatSession } from '~/containers/LlamaAI/projects/types'
import { useAuthContext } from '~/containers/Subscription/auth'

export function useClearUnseenCompletion() {
	const queryClient = useQueryClient()
	const { user } = useAuthContext()

	return useCallback(
		(sessionId: string, projectId?: string | null) => {
			if (user) {
				queryClient.setQueryData<SessionListInfiniteData | undefined>([SESSIONS_QUERY_KEY, user.id], (old) =>
					updateSessionInInfiniteData(old, sessionId, (session) => ({ ...session, hasUnseenCompletion: false }))
				)
			}

			if (projectId) {
				queryClient.setQueryData<ProjectChatSession[]>(projectSessionsKey(projectId), (old) =>
					old?.map((session) =>
						session.sessionId === sessionId ? { ...session, hasUnseenCompletion: false } : session
					)
				)
			}
		},
		[queryClient, user]
	)
}
