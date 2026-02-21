import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
import type { ChatSession, ResearchUsage } from './useChatHistory'

export interface SessionListData {
	sessions: ChatSession[]
	usage: ResearchUsage | null
}

export const SESSIONS_QUERY_KEY = 'llamaai-sessions'

export function useSessionList() {
	const { user, authorizedFetch, isAuthenticated } = useAuthContext()
	const queryClient = useQueryClient()

	const { data = { sessions: [], usage: null }, isLoading } = useQuery({
		queryKey: [SESSIONS_QUERY_KEY, user?.id],
		queryFn: async (): Promise<SessionListData> => {
			try {
				if (!user) return { sessions: [], usage: null }
				const data = await authorizedFetch(`${MCP_SERVER}/user/sessions`)
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

				const existingData = queryClient.getQueryData([SESSIONS_QUERY_KEY, user.id]) as SessionListData | undefined
				const existingSessions = existingData?.sessions || []
				const fakeSessions = existingSessions.filter(
					(session) => !data.sessions.some((realSession: ChatSession) => realSession.sessionId === session.sessionId)
				)

				return {
					sessions: [...fakeSessions, ...data.sessions],
					usage: data.usage?.research_report || null
				}
			} catch (error) {
				console.log('Failed to fetch sessions:', error)
				throw new Error('Failed to fetch sessions')
			}
		},
		enabled: isAuthenticated && !!user,
		staleTime: 30000
	})

	const moveSessionToTop = useCallback(
		(sessionId: string) => {
			if (!user) return

			queryClient.setQueryData([SESSIONS_QUERY_KEY, user.id], (old: SessionListData | undefined) => {
				if (!old) return { sessions: [], usage: null }
				const sessionIndex = old.sessions.findIndex((s) => s.sessionId === sessionId)
				if (sessionIndex === -1) return old

				// Create a new array without the moved session
				const updatedSessions = old.sessions.filter((_, idx) => idx !== sessionIndex)
				// Create a new session object with updated lastActivity (avoid mutating the original)
				const movedSessionCopy: ChatSession = {
					...old.sessions[sessionIndex],
					lastActivity: new Date().toISOString()
				}

				return { ...old, sessions: [movedSessionCopy, ...updatedSessions] }
			})
		},
		[user, queryClient]
	)

	return {
		sessions: data.sessions,
		researchUsage: data.usage,
		isLoading,
		moveSessionToTop
	}
}
