import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { llamaAIRequest } from '~/containers/LlamaAI/api/transport'
import {
	prependSessionToInfiniteData,
	removeSessionFromInfiniteData,
	removeSessionsFromInfiniteData,
	replaceSessionIdInInfiniteData,
	SESSIONS_QUERY_KEY,
	type SessionListInfiniteData,
	updateSessionInInfiniteData
} from '~/containers/LlamaAI/hooks/sessionListCache'
import { isProjectSessionsQueryKey, projectSessionsKey } from '~/containers/LlamaAI/projects/queryKeys'
import type { ProjectChatSession } from '~/containers/LlamaAI/projects/types'
import type { ChatSession } from '~/containers/LlamaAI/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import { getErrorMessage } from '~/utils/error'

type SwitchActiveLeafResponse = {
	activeLeafMessageId: string
	messages?: unknown[]
	pagination?: {
		hasMore?: boolean
		cursor?: number | null
		hasNewer?: boolean
		newerCursor?: number | null
	}
}

type SessionRestoreResponse = {
	messages?: unknown[]
	conversationHistory?: unknown[]
	hasMore?: boolean
	nextCursor?: number | null
	totalMessages?: number
	hasNewer?: boolean
	newerCursor?: number | null
	streaming?: unknown
	todos?: unknown
	projectId?: string | null
}

function assertSwitchActiveLeafResponse(response: unknown): asserts response is SwitchActiveLeafResponse {
	if (!response || typeof response !== 'object' || Array.isArray(response)) {
		throw new Error('Invalid branch switch response')
	}

	const result = response as {
		activeLeafMessageId?: unknown
		messages?: unknown
		pagination?: unknown
	}

	if (typeof result.activeLeafMessageId !== 'string' || result.activeLeafMessageId.trim() === '') {
		throw new Error('Invalid branch switch response: missing active leaf message')
	}

	if (result.messages !== undefined && !Array.isArray(result.messages)) {
		throw new Error('Invalid branch switch response: messages must be an array')
	}

	if (result.pagination === undefined) return

	if (!result.pagination || typeof result.pagination !== 'object' || Array.isArray(result.pagination)) {
		throw new Error('Invalid branch switch response: pagination must be an object')
	}

	const pagination = result.pagination as {
		hasMore?: unknown
		cursor?: unknown
		hasNewer?: unknown
		newerCursor?: unknown
	}

	if (pagination.hasMore !== undefined && typeof pagination.hasMore !== 'boolean') {
		throw new Error('Invalid branch switch response: pagination.hasMore must be a boolean')
	}
	if (pagination.cursor !== undefined && pagination.cursor !== null && typeof pagination.cursor !== 'number') {
		throw new Error('Invalid branch switch response: pagination.cursor must be a number or null')
	}
	if (pagination.hasNewer !== undefined && typeof pagination.hasNewer !== 'boolean') {
		throw new Error('Invalid branch switch response: pagination.hasNewer must be a boolean')
	}
	if (
		pagination.newerCursor !== undefined &&
		pagination.newerCursor !== null &&
		typeof pagination.newerCursor !== 'number'
	) {
		throw new Error('Invalid branch switch response: pagination.newerCursor must be a number or null')
	}
}

function mutationActionError(action: string, error: unknown) {
	return new Error(`${action}: ${getErrorMessage(error)}`)
}

export function useSessionMutations() {
	const { user, authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()

	const invalidateProjectSessions = (projectId?: string | null) => {
		if (projectId) {
			void queryClient.invalidateQueries({ queryKey: projectSessionsKey(projectId) })
			return
		}
		void queryClient.invalidateQueries({ predicate: (query) => isProjectSessionsQueryKey(query.queryKey) })
	}

	const prependProjectSession = useCallback(
		(projectId: string, session: ProjectChatSession) => {
			queryClient.setQueryData<ProjectChatSession[]>(projectSessionsKey(projectId), (old) => {
				const sessions = old?.filter((item) => item.sessionId !== session.sessionId) ?? []
				return [session, ...sessions]
			})
		},
		[queryClient]
	)

	const removeProjectSession = useCallback(
		(projectId: string, sessionId: string) => {
			queryClient.setQueryData<ProjectChatSession[]>(projectSessionsKey(projectId), (old) =>
				old?.filter((item) => item.sessionId !== sessionId)
			)
		},
		[queryClient]
	)

	const replaceOptimisticSessionId = useCallback(
		(previousSessionId: string, nextSessionId: string, projectId?: string | null) => {
			if (user) {
				queryClient.setQueryData([SESSIONS_QUERY_KEY, user.id], (old: SessionListInfiniteData | undefined) =>
					replaceSessionIdInInfiniteData(old, previousSessionId, nextSessionId)
				)
			}

			if (projectId) {
				queryClient.setQueryData<ProjectChatSession[]>(projectSessionsKey(projectId), (old) =>
					old?.map((session) =>
						session.sessionId === previousSessionId
							? { ...session, sessionId: nextSessionId, isOptimistic: false }
							: session
					)
				)
			}
		},
		[user, queryClient]
	)

	// Persist a newly-created chat session once the backend assigns it a real identity.
	const createSessionMutation = useMutation({
		mutationFn: async ({
			sessionId,
			title,
			projectId
		}: {
			sessionId: string
			title?: string
			projectId?: string | null
		}) => {
			try {
				const response = await llamaAIRequest(authorizedFetch, '/user/sessions', {
					method: 'POST',
					json: { sessionId, title, projectId }
				})

				return response
			} catch (error) {
				console.log('Failed to create session:', error)
				throw new Error(`Failed to create session: ${getErrorMessage(error)}`)
			}
		},
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
			if (variables.projectId) invalidateProjectSessions(variables.projectId)
		},
		onError: (_error, variables) => {
			if (user) {
				queryClient.setQueryData([SESSIONS_QUERY_KEY, user.id], (old: SessionListInfiniteData | undefined) =>
					removeSessionFromInfiniteData(old, variables.sessionId)
				)
			}
			if (variables.projectId) removeProjectSession(variables.projectId, variables.sessionId)
		}
	})

	// Shared restore mutation backs both full-session restore and paginated older-message loading.
	const restoreSessionMutation = useMutation({
		mutationFn: async ({
			sessionId,
			limit,
			cursor,
			around,
			afterSequence
		}: {
			sessionId: string
			limit?: number
			cursor?: number
			around?: string
			afterSequence?: number
		}) => {
			try {
				const params = new URLSearchParams()
				if (limit !== undefined) params.append('limit', limit.toString())
				if (cursor !== undefined) params.append('cursor', cursor.toString())
				if (around) params.append('around', around)
				if (afterSequence !== undefined) params.append('afterSequence', afterSequence.toString())

				const query = params.toString()
				const response = await llamaAIRequest<SessionRestoreResponse>(
					authorizedFetch,
					`/user/sessions/${sessionId}/restore${query ? `?${query}` : ''}`
				)

				return response
			} catch (error) {
				console.log('Failed to restore session:', error)
				throw new Error(`Failed to restore session: ${getErrorMessage(error)}`)
			}
		}
	})

	const switchActiveLeafMutation = useMutation({
		mutationKey: ['llamaai', 'switch-active-leaf'],
		mutationFn: async ({ sessionId, leafMessageId }: { sessionId: string; leafMessageId: string }) => {
			try {
				const response: unknown = await llamaAIRequest(authorizedFetch, `/agentic/${sessionId}/active-leaf`, {
					method: 'POST',
					json: { leafMessageId }
				})

				assertSwitchActiveLeafResponse(response)
				return response
			} catch (error) {
				console.error('[llama-ai] [switchActiveLeaf] failed:', getErrorMessage(error))
				throw error instanceof Error ? error : new Error('Failed to switch branch')
			}
		}
	})

	// Delete from both the backend and the optimistic sidebar/session cache.
	const deleteSessionMutation = useMutation({
		mutationFn: async ({ sessionId }: { sessionId: string; projectId?: string | null }) => {
			try {
				await llamaAIRequest(authorizedFetch, `/user/sessions/${sessionId}`, {
					method: 'DELETE'
				})
			} catch (error) {
				console.log('Failed to delete session:', error)
				throw new Error(`Failed to delete session: ${getErrorMessage(error)}`)
			}
		},
		onMutate: async ({ sessionId }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: [SESSIONS_QUERY_KEY, user?.id] })

			// Snapshot previous value for rollback
			const previous = queryClient.getQueryData<SessionListInfiniteData>([SESSIONS_QUERY_KEY, user?.id])

			// Optimistically update
			queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], (old: SessionListInfiniteData | undefined) =>
				removeSessionFromInfiniteData(old, sessionId)
			)

			return { previous }
		},
		onError: (_err, _sessionId, context) => {
			// Rollback to previous state on error
			if (context?.previous) {
				queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], context.previous)
			}
		},
		onSettled: (_data, _error, variables) => {
			// Always invalidate after mutation settles (success or error)
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
			if (variables.projectId) invalidateProjectSessions(variables.projectId)
		}
	})

	const bulkDeleteSessionsMutation = useMutation({
		mutationFn: async (sessionIds: string[]) => {
			try {
				await llamaAIRequest(authorizedFetch, '/user/sessions/bulk', {
					method: 'DELETE',
					json: { sessionIds }
				})
			} catch (error) {
				throw mutationActionError('Failed to bulk delete sessions', error)
			}
		},
		onMutate: async (sessionIds) => {
			await queryClient.cancelQueries({ queryKey: [SESSIONS_QUERY_KEY, user?.id] })
			const previous = queryClient.getQueryData<SessionListInfiniteData>([SESSIONS_QUERY_KEY, user?.id])
			const idsSet = new Set(sessionIds)
			queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], (old: SessionListInfiniteData | undefined) =>
				removeSessionsFromInfiniteData(old, idsSet)
			)
			return { previous }
		},
		onError: (_err, _sessionIds, context) => {
			if (context?.previous) {
				queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], context.previous)
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
			invalidateProjectSessions()
		}
	})

	// Rename a session optimistically so the sidebar updates immediately.
	const updateTitleMutation = useMutation({
		mutationFn: async ({ sessionId, title }: { sessionId: string; title: string; projectId?: string | null }) => {
			try {
				const response = await llamaAIRequest(authorizedFetch, `/user/sessions/${sessionId}/title`, {
					method: 'PUT',
					json: { title }
				})

				return response
			} catch (error) {
				throw mutationActionError('Failed to update session title', error)
			}
		},
		onMutate: async ({ sessionId, title }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: [SESSIONS_QUERY_KEY, user?.id] })

			// Snapshot previous value for rollback
			const previous = queryClient.getQueryData<SessionListInfiniteData>([SESSIONS_QUERY_KEY, user?.id])

			// Optimistically update the global session cache
			queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], (old: SessionListInfiniteData | undefined) =>
				updateSessionInInfiniteData(old, sessionId, (session) => ({ ...session, title }))
			)

			return { previous }
		},
		onError: (_err, _variables, context) => {
			// Rollback to previous state on error
			if (context?.previous) {
				queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], context.previous)
			}
		},
		onSettled: (_data, _error, variables) => {
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
			if (variables.projectId) invalidateProjectSessions(variables.projectId)
		}
	})

	const pinSessionMutation = useMutation({
		mutationFn: async (sessionId: string) => {
			try {
				const response = await llamaAIRequest(authorizedFetch, `/user/sessions/${sessionId}/pin`, {
					method: 'PUT'
				})

				return response
			} catch (error) {
				throw mutationActionError('Failed to toggle pin', error)
			}
		},
		onMutate: async (sessionId) => {
			await queryClient.cancelQueries({ queryKey: [SESSIONS_QUERY_KEY, user?.id] })
			const previous = queryClient.getQueryData<SessionListInfiniteData>([SESSIONS_QUERY_KEY, user?.id])
			queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], (old: SessionListInfiniteData | undefined) =>
				updateSessionInInfiniteData(old, sessionId, (session) => ({
					...session,
					isPinned: !session.isPinned,
					pinnedAt: !session.isPinned ? new Date().toISOString() : undefined
				}))
			)
			return { previous }
		},
		onError: (_err, _sessionId, context) => {
			if (context?.previous) {
				queryClient.setQueryData([SESSIONS_QUERY_KEY, user?.id], context.previous)
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
			invalidateProjectSessions()
		}
	})

	// Insert a temporary session into the cache so first-message submits have a stable local target.
	const createFakeSession = useCallback(
		(projectId?: string | null) => {
			const sessionId = crypto.randomUUID()
			const title = 'New Chat'
			const now = new Date().toISOString()

			if (user) {
				const fakeSession: ChatSession = {
					sessionId,
					title,
					createdAt: now,
					lastActivity: now,
					isActive: true,
					isOptimistic: true,
					projectId: projectId ?? null
				}

				queryClient.setQueryData([SESSIONS_QUERY_KEY, user.id], (old: SessionListInfiniteData | undefined) =>
					prependSessionToInfiniteData(old, fakeSession)
				)

				if (projectId) {
					prependProjectSession(projectId, {
						sessionId,
						title,
						createdAt: now,
						lastActivity: now,
						isPinned: false,
						pinnedAt: null,
						isPublic: false,
						shareToken: null
					})
				}
			}

			return sessionId
		},
		[user, queryClient, prependProjectSession]
	)

	// Normalize the restore API payload into the shape the chat screen consumes.
	const restoreSession = useCallback(
		async (sessionId: string, limit: number = 10, around?: string) => {
			try {
				const result = await restoreSessionMutation.mutateAsync({
					sessionId,
					limit: around ? 20 : limit,
					around
				})
				return {
					messages: result.messages || result.conversationHistory || [],
					pagination: {
						hasMore: result.hasMore ?? false,
						isLoadingMore: false,
						cursor: result.nextCursor,
						totalMessages: result.totalMessages,
						hasNewer: result.hasNewer ?? false,
						newerCursor: result.newerCursor
					},
					streaming: result.streaming,
					todos: result.todos,
					projectId: result.projectId ?? null
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
						hasMore: result.hasMore ?? false,
						isLoadingMore: false,
						cursor: result.nextCursor,
						totalMessages: result.totalMessages
					}
				}
			} catch (error) {
				console.error('[llama-ai] [loadMoreMessages] failed:', getErrorMessage(error))
				throw new Error(`Failed to load older messages: ${getErrorMessage(error)}`)
			}
		},
		[restoreSessionMutation]
	)

	const loadNewerMessages = useCallback(
		async (sessionId: string, afterSequence: number) => {
			try {
				const result = await restoreSessionMutation.mutateAsync({ sessionId, limit: 10, afterSequence })
				return {
					messages: result.messages || result.conversationHistory || [],
					pagination: {
						hasNewer: result.hasNewer ?? false,
						newerCursor: result.newerCursor
					}
				}
			} catch (error) {
				console.error('[llama-ai] [loadNewerMessages] failed:', getErrorMessage(error))
				throw new Error(`Failed to load newer messages: ${getErrorMessage(error)}`)
			}
		},
		[restoreSessionMutation]
	)

	const deleteSession = useCallback(
		(sessionId: string, projectId?: string | null) => deleteSessionMutation.mutateAsync({ sessionId, projectId }),
		[deleteSessionMutation]
	)

	const updateSessionTitle = useCallback(
		(args: { sessionId: string; title: string; projectId?: string | null }) => updateTitleMutation.mutateAsync(args),
		[updateTitleMutation]
	)

	const pinSession = useCallback((sessionId: string) => pinSessionMutation.mutateAsync(sessionId), [pinSessionMutation])

	return {
		createSession: createSessionMutation.mutateAsync,
		createFakeSession,
		replaceOptimisticSessionId,
		restoreSession,
		loadMoreMessages,
		loadNewerMessages,
		switchActiveLeaf: switchActiveLeafMutation.mutateAsync,
		deleteSession,
		updateSessionTitle,
		isCreatingSession: createSessionMutation.isPending,
		isRestoringSession: restoreSessionMutation.isPending,
		isSwitchingActiveLeaf: switchActiveLeafMutation.isPending,
		isDeletingSession: deleteSessionMutation.isPending,
		isUpdatingTitle: updateTitleMutation.isPending,
		bulkDeleteSessions: bulkDeleteSessionsMutation.mutateAsync,
		isBulkDeleting: bulkDeleteSessionsMutation.isPending,
		pinSession,
		isPinningSession: pinSessionMutation.isPending
	}
}
