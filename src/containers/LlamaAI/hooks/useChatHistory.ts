import { useCallback, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'

export interface ChatSession {
	sessionId: string
	title: string
	createdAt: string
	lastActivity: string
	isActive: boolean
	isPublic?: boolean
	shareToken?: string
}

export interface ConversationExchange {
	question: string
	response: {
		answer: string
		metadata?: any
		suggestions?: any[]
		charts?: any[]
		chartData?: any[]
	}
	timestamp: number
}

export interface PaginationState {
	hasMore: boolean
	isLoadingMore: boolean
	cursor?: number
	totalMessages?: number
}

export function useChatHistory() {
	const { user, authorizedFetch, isAuthenticated } = useAuthContext()
	const queryClient = useQueryClient()

	const { data: sessions = [], isLoading } = useQuery({
		queryKey: ['chat-sessions', user?.id],
		queryFn: async () => {
			try {
				if (!user) return []
				const data = await authorizedFetch(`${MCP_SERVER}/user/sessions`)
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())

				const existingData = (queryClient.getQueryData(['chat-sessions', user.id]) as ChatSession[]) || []
				const fakeSessions = existingData.filter(
					(session) => !data.sessions.some((realSession: ChatSession) => realSession.sessionId === session.sessionId)
				)

				return [...fakeSessions, ...data.sessions]
			} catch (error) {
				console.log('Failed to fetch sessions:', error)
				throw new Error('Failed to fetch sessions')
			}
		},
		enabled: isAuthenticated && !!user,
		staleTime: 30000
	})

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
			queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
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
			queryClient.setQueryData(['chat-sessions', user.id], (old: ChatSession[] = []) => {
				return old.filter((session) => session.sessionId !== sessionId)
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
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
			queryClient.setQueryData(['chat-sessions', user.id], (old: ChatSession[] = []) => {
				return old.map((session) => {
					if (session.sessionId === sessionId) {
						return { ...session, title }
					}
					return session
				})
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
		}
	})

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

			queryClient.setQueryData(['chat-sessions', user.id], (old: ChatSession[] = []) => [fakeSession, ...old])
		}

		return sessionId
	}, [user, queryClient])

	const restoreSession = useCallback(
		async (sessionId: string, limit: number = 10) => {
			try {
				const result = await restoreSessionMutation.mutateAsync({ sessionId, limit })
				return {
					conversationHistory: result.conversationHistory || [],
					pagination: {
						hasMore: result.hasMore || false,
						isLoadingMore: false,
						cursor: result.nextCursor,
						totalMessages: result.totalMessages
					}
				}
			} catch (error) {
				console.log('Failed to restore session:', error)
				return {
					conversationHistory: [],
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
					conversationHistory: result.conversationHistory || [],
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
					conversationHistory: [],
					pagination: {
						hasMore: false,
						isLoadingMore: false
					}
				}
			}
		},
		[restoreSessionMutation]
	)

	const moveSessionToTop = useCallback(
		(sessionId: string) => {
			if (!user) return

			queryClient.setQueryData(['chat-sessions', user.id], (oldSessions: ChatSession[] = []) => {
				const sessionIndex = oldSessions.findIndex((s) => s.sessionId === sessionId)
				if (sessionIndex === -1) return oldSessions

				const updatedSessions = [...oldSessions]
				const [movedSession] = updatedSessions.splice(sessionIndex, 1)
				movedSession.lastActivity = new Date().toISOString()

				return [movedSession, ...updatedSessions]
			})
		},
		[user, queryClient]
	)

	const toggleSidebar = useCallback(() => {
		const currentVisible = localStorage.getItem('llamaai-sidebar-hidden') === 'true'
		localStorage.setItem('llamaai-sidebar-hidden', String(!currentVisible))
		window.dispatchEvent(new Event('chatHistorySidebarChange'))
	}, [])

	const sidebarHidden = useSyncExternalStore(
		subscribeToChatHistorySidebar,
		() => localStorage.getItem('llamaai-sidebar-hidden') ?? 'true',
		() => 'true'
	)

	return {
		sessions,
		isLoading,
		sidebarVisible: sidebarHidden !== 'true',
		createFakeSession,
		restoreSession,
		loadMoreMessages,
		deleteSession: deleteSessionMutation.mutateAsync,
		updateSessionTitle: updateTitleMutation.mutateAsync,
		moveSessionToTop,
		toggleSidebar,
		isCreatingSession: createSessionMutation.isPending,
		isRestoringSession: restoreSessionMutation.isPending,
		isDeletingSession: deleteSessionMutation.isPending,
		isUpdatingTitle: updateTitleMutation.isPending
	}
}

function subscribeToChatHistorySidebar(callback: () => void) {
	window.addEventListener('chatHistorySidebarChange', callback)

	return () => {
		window.removeEventListener('chatHistorySidebarChange', callback)
	}
}
