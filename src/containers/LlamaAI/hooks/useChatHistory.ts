import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'

export interface ChatSession {
	sessionId: string
	title: string
	createdAt: string
	lastActivity: string
	isActive: boolean
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
	const [sidebarVisible, setSidebarVisible] = useState(() => {
		if (typeof window === 'undefined') return false
		return localStorage.getItem('llamaai-sidebar-hidden') === 'true'
	})

	const { data: sessions = [], isLoading } = useQuery({
		queryKey: ['chat-sessions', user?.id],
		queryFn: async () => {
			if (!user) return []
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions`)
			if (!response.ok) throw new Error('Failed to fetch sessions')
			const data = await response.json()

			const existingData = (queryClient.getQueryData(['chat-sessions', user.id]) as ChatSession[]) || []
			const fakeSessions = existingData.filter(
				(session) => !data.sessions.some((realSession: ChatSession) => realSession.sessionId === session.sessionId)
			)

			return [...fakeSessions, ...data.sessions]
		},
		enabled: isAuthenticated && !!user,
		staleTime: 30000
	})

	const createSessionMutation = useMutation({
		mutationFn: async ({ sessionId, title }: { sessionId: string; title?: string }) => {
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId, title })
			})
			if (!response.ok) throw new Error('Failed to create session')
			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
		}
	})

	const restoreSessionMutation = useMutation({
		mutationFn: async ({ sessionId, limit, cursor }: { sessionId: string; limit?: number; cursor?: number }) => {
			const params = new URLSearchParams()
			if (limit !== undefined) params.append('limit', limit.toString())
			if (cursor !== undefined) params.append('cursor', cursor.toString())

			const url = `${MCP_SERVER}/user/sessions/${sessionId}/restore${params.toString() ? `?${params}` : ''}`
			const response = await authorizedFetch(url)
			if (!response.ok) throw new Error('Failed to restore session')
			return response.json()
		}
	})

	const deleteSessionMutation = useMutation({
		mutationFn: async (sessionId: string) => {
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions/${sessionId}`, {
				method: 'DELETE'
			})
			if (!response.ok) throw new Error('Failed to delete session')
			return response.json()
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
			if (!response.ok) {
				throw new Error(`Failed to update title: ${response.status}`)
			}
			const result = await response.json()
			return result
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
				console.error('Failed to restore session:', error)
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
				console.error('Failed to load more messages:', error)
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
		const newVisible = !sidebarVisible
		setSidebarVisible(newVisible)
		localStorage.setItem('llamaai-sidebar-hidden', String(!newVisible))
	}, [sidebarVisible])

	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === 'llamaai-sidebar-hidden') {
				setSidebarVisible(e.newValue !== 'true')
			}
		}
		window.addEventListener('storage', handleStorageChange)
		return () => window.removeEventListener('storage', handleStorageChange)
	}, [])

	return {
		sessions,
		isLoading,
		sidebarVisible,
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
