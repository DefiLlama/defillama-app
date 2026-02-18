import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
import type { ChatSession } from './useChatHistory'
import { SESSIONS_QUERY_KEY, type SessionListData } from './useSessionList'

export function useSessionMutations() {
	const { user, authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()

	const createSessionMutation = useMutation({
		mutationFn: async ({ sessionId, title }: { sessionId: string; title?: string }) => {
			try {
				const response = await authorizedFetch(`${MCP_SERVER}/user/sessions`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sessionId, title })
				})
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

				return response
			} catch (error) {
				console.log('Failed to create session:', error)
				throw new Error('Failed to create session')
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
		}
	})

	const restoreSessionMutation = useMutation({
		mutationFn: async ({ sessionId, limit, cursor }: { sessionId: string; limit?: number; cursor?: number }) => {
			try {
				const params = new URLSearchParams()
				if (limit !== undefined) params.append('limit', limit.toString())
				if (cursor !== undefined) params.append('cursor', cursor.toString())

				const url = `${MCP_SERVER}/user/sessions/${sessionId}/restore${params.toString() ? `?${params}` : ''}`
				const response = await authorizedFetch(url)
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

				return response
			} catch (error) {
				console.log('Failed to restore session:', error)
				throw new Error('Failed to restore session')
			}
		}
	})

	const deleteSessionMutation = useMutation({
		mutationFn: async (sessionId: string) => {
			try {
				const response = await authorizedFetch(`${MCP_SERVER}/user/sessions/${sessionId}`, {
					method: 'DELETE'
				})
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
			queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
		}
	})

	const updateTitleMutation = useMutation({
		mutationFn: async ({ sessionId, title }: { sessionId: string; title: string }) => {
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions/${sessionId}/title`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			})
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
			queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
		}
	})

	const createFakeSession = useCallback(() => {
		const sessionId =
			crypto?.randomUUID?.() ??
			'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
				const r = (Math.random() * 16) | 0
				return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
			})
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
				console.log('Failed to restore session:', error)
				return {
					messages: [],
					pagination: {
						hasMore: false,
						isLoadingMore: false
					}
				}
			}
		},
		[restoreSessionMutation]
	)

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
				console.log('Failed to load more messages:', error)
				return {
					messages: [],
					pagination: {
						hasMore: false,
						isLoadingMore: false
					}
				}
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
