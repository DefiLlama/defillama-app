import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
import { getErrorMessage } from '~/utils/error'
import type { ChatSession } from '../types'
import { assertResponse } from '../utils/assertResponse'
import { SESSIONS_QUERY_KEY, type SessionListData } from './useSessionList'

export function useSessionMutations() {
	const { user, authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()

	// Persist a newly-created chat session once the backend assigns it a real identity.
	const createSessionMutation = useMutation({
		mutationFn: async ({ sessionId, title }: { sessionId: string; title?: string }) => {
			try {
				const response = await authorizedFetch(`${MCP_SERVER}/user/sessions`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sessionId, title })
				})
					.then((res) => assertResponse(res, 'Failed to create session'))
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

				return response
			} catch (error) {
				console.log('Failed to create session:', error)
				throw new Error('Failed to create session')
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
		}
	})

	// Shared restore mutation backs both full-session restore and paginated older-message loading.
	const restoreSessionMutation = useMutation({
		mutationFn: async ({ sessionId, limit, cursor }: { sessionId: string; limit?: number; cursor?: number }) => {
			try {
				const params = new URLSearchParams()
				if (limit !== undefined) params.append('limit', limit.toString())
				if (cursor !== undefined) params.append('cursor', cursor.toString())

				const url = `${MCP_SERVER}/user/sessions/${sessionId}/restore${params.toString() ? `?${params}` : ''}`
				const response = await authorizedFetch(url)
					.then((res) => assertResponse(res, 'Failed to restore session'))
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

				return response
			} catch (error) {
				console.log('Failed to restore session:', error)
				throw new Error('Failed to restore session')
			}
		}
	})

	// Delete from both the backend and the optimistic sidebar/session cache.
	const deleteSessionMutation = useMutation({
		mutationFn: async (sessionId: string) => {
			try {
				const response = await authorizedFetch(`${MCP_SERVER}/user/sessions/${sessionId}`, {
					method: 'DELETE'
				})
					.then((res) => assertResponse(res, 'Failed to delete session'))
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

				return response
			} catch (error) {
				console.log('Failed to delete session:', error)
				throw new Error('Failed to delete session')
			}
		},
		onMutate: async (sessionId) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: [SESSIONS_QUERY_KEY, user?.id] })

			// Snapshot previous value for rollback
			const previous = queryClient.getQueryData<SessionListData>([SESSIONS_QUERY_KEY, user?.id])

			// Optimistically update
			queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], (old: SessionListData | undefined) => {
				if (!old) return { sessions: [], usage: null }
				return {
					...old,
					sessions: old.sessions.filter((session) => session.sessionId !== sessionId)
				}
			})

			return { previous }
		},
		onError: (_err, _sessionId, context) => {
			// Rollback to previous state on error
			if (context?.previous) {
				queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], context.previous)
			}
		},
		onSettled: () => {
			// Always invalidate after mutation settles (success or error)
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
		}
	})

	// Rename a session optimistically so the sidebar updates immediately.
	const updateTitleMutation = useMutation({
		mutationFn: async ({ sessionId, title }: { sessionId: string; title: string }) => {
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions/${sessionId}/title`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			})
				.then((res) => assertResponse(res, 'Failed to update session title'))
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return response
		},
		onMutate: async ({ sessionId, title }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: [SESSIONS_QUERY_KEY, user?.id] })

			// Snapshot previous value for rollback
			const previous = queryClient.getQueryData<SessionListData>([SESSIONS_QUERY_KEY, user?.id])

			// Optimistically update
			queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], (old: SessionListData | undefined) => {
				if (!old) return { sessions: [], usage: null }
				return {
					...old,
					sessions: old.sessions.map((session) => {
						if (session.sessionId === sessionId) {
							return { ...session, title }
						}
						return session
					})
				}
			})

			return { previous }
		},
		onError: (_err, _variables, context) => {
			// Rollback to previous state on error
			if (context?.previous) {
				queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], context.previous)
			}
		},
		onSettled: () => {
			// Always invalidate after mutation settles (success or error)
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
		}
	})

	// Insert a temporary session into the cache so first-message submits have a stable local target.
	const createFakeSession = useCallback(() => {
		const sessionId = crypto.randomUUID()
		const title = 'New Chat'

		if (user) {
			const fakeSession: ChatSession = {
				sessionId,
				title,
				createdAt: new Date().toISOString(),
				lastActivity: new Date().toISOString(),
				isActive: true
			}

			queryClient.setQueryData([SESSIONS_QUERY_KEY, user.id], (old: SessionListData | undefined) => ({
				usage: old?.usage ?? null,
				sessions: [fakeSession, ...(old?.sessions ?? [])]
			}))
		}

		return sessionId
	}, [user, queryClient])

	// Normalize the restore API payload into the shape the chat screen consumes.
	const restoreSession = useCallback(
		async (sessionId: string, limit: number = 10) => {
			try {
				const result = await restoreSessionMutation.mutateAsync({ sessionId, limit })
				return {
					messages: result.messages || result.conversationHistory || [],
					pagination: {
						hasMore: result.hasMore || false,
						isLoadingMore: false,
						cursor: result.nextCursor,
						totalMessages: result.totalMessages
					},
					streaming: result.streaming
				}
			} catch (error) {
				console.error('[llama-ai] [restoreSession] failed:', getErrorMessage(error))
				throw error instanceof Error ? error : new Error('Failed to restore session')
			}
		},
		[restoreSessionMutation]
	)

	// Reuse the restore endpoint to fetch older history pages for infinite scroll.
	const loadMoreMessages = useCallback(
		async (sessionId: string, cursor: number) => {
			try {
				const result = await restoreSessionMutation.mutateAsync({ sessionId, limit: 10, cursor })
				return {
					messages: result.messages || result.conversationHistory || [],
					pagination: {
						hasMore: result.hasMore || false,
						isLoadingMore: false,
						cursor: result.nextCursor,
						totalMessages: result.totalMessages
					}
				}
			} catch (error) {
				console.error('[llama-ai] [loadMoreMessages] failed:', getErrorMessage(error))
				throw new Error('Failed to load older messages')
			}
		},
		[restoreSessionMutation]
	)

	return {
		createFakeSession,
		restoreSession,
		loadMoreMessages,
		deleteSession: deleteSessionMutation.mutateAsync,
		updateSessionTitle: updateTitleMutation.mutateAsync,
		isCreatingSession: createSessionMutation.isPending,
		isRestoringSession: restoreSessionMutation.isPending,
		isDeletingSession: deleteSessionMutation.isPending,
		isUpdatingTitle: updateTitleMutation.isPending
	}
}
