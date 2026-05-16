import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { AI_SERVER } from '~/constants'
import {
	prependSessionToInfiniteData,
	removeSessionFromInfiniteData,
	removeSessionsFromInfiniteData,
	SESSIONS_QUERY_KEY,
	type SessionListInfiniteData,
	updateSessionInInfiniteData
} from '~/containers/LlamaAI/hooks/sessionListCache'
import { isProjectSessionsQueryKey, projectSessionsKey } from '~/containers/LlamaAI/projects/queryKeys'
import type { ChatSession } from '~/containers/LlamaAI/types'
import { assertResponse } from '~/containers/LlamaAI/utils/assertResponse'
import { useAuthContext } from '~/containers/Subscription/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
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
				const response = await authorizedFetch(`${AI_SERVER}/user/sessions`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sessionId, title, projectId })
				})
					.then((res) => assertResponse(res, 'Failed to create session'))
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

				return response
			} catch (error) {
				console.log('Failed to create session:', error)
				throw new Error(`Failed to create session: ${getErrorMessage(error)}`)
			}
		},
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
			if (variables.projectId) invalidateProjectSessions(variables.projectId)
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

				const url = `${AI_SERVER}/user/sessions/${sessionId}/restore${params.toString() ? `?${params}` : ''}`
				const response = await authorizedFetch(url)
					.then((res) => assertResponse(res, 'Failed to restore session'))
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

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
				const response: unknown = await authorizedFetch(`${AI_SERVER}/agentic/${sessionId}/active-leaf`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ leafMessageId })
				})
					.then((res) => assertResponse(res, 'Failed to switch branch'))
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

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
				await authorizedFetch(`${AI_SERVER}/user/sessions/${sessionId}`, {
					method: 'DELETE'
				})
					.then((res) => assertResponse(res, 'Failed to delete session'))
					.then(handleSimpleFetchResponse)
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
			await authorizedFetch(`${AI_SERVER}/user/sessions/bulk`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionIds })
			})
				.then((res) => assertResponse(res, 'Failed to bulk delete sessions'))
				.then(handleSimpleFetchResponse)
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
			const response = await authorizedFetch(`${AI_SERVER}/user/sessions/${sessionId}/title`, {
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
			const response = await authorizedFetch(`${AI_SERVER}/user/sessions/${sessionId}/pin`, {
				method: 'PUT'
			})
				.then((res) => assertResponse(res, 'Failed to toggle pin'))
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return response
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

			if (user) {
				const fakeSession: ChatSession = {
					sessionId,
					title,
					createdAt: new Date().toISOString(),
					lastActivity: new Date().toISOString(),
					isActive: true,
					isOptimistic: true,
					projectId: projectId ?? null
				}

				queryClient.setQueryData([SESSIONS_QUERY_KEY, user.id], (old: SessionListInfiniteData | undefined) =>
					prependSessionToInfiniteData(old, fakeSession)
				)
			}

			return sessionId
		},
		[user, queryClient]
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

	return {
		createSession: createSessionMutation.mutateAsync,
		createFakeSession,
		restoreSession,
		loadMoreMessages,
		loadNewerMessages,
		switchActiveLeaf: switchActiveLeafMutation.mutateAsync,
		deleteSession,
		updateSessionTitle: updateTitleMutation.mutateAsync,
		isCreatingSession: createSessionMutation.isPending,
		isRestoringSession: restoreSessionMutation.isPending,
		isSwitchingActiveLeaf: switchActiveLeafMutation.isPending,
		isDeletingSession: deleteSessionMutation.isPending,
		isUpdatingTitle: updateTitleMutation.isPending,
		bulkDeleteSessions: bulkDeleteSessionsMutation.mutateAsync,
		isBulkDeleting: bulkDeleteSessionsMutation.isPending,
		pinSession: pinSessionMutation.mutateAsync,
		isPinningSession: pinSessionMutation.isPending
	}
}
