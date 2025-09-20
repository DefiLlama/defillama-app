import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
		if (typeof window === 'undefined') return true
		return localStorage.getItem('llamaai-sidebar-hidden') !== 'true'
	})

	const { data: sessions = [], isLoading } = useQuery({
		queryKey: ['chat-sessions', user?.id],
		queryFn: async () => {
			if (!user) return []
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions`)
			if (!response.ok) throw new Error('Failed to fetch sessions')
			const data = await response.json()
			return data.sessions
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
			if (!response.ok) throw new Error('Failed to update title')
			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
		}
	})

	const createOptimisticSession = useCallback(() => {
		const sessionId = crypto.randomUUID()
		const title = 'New Chat'

		if (user) {
			const optimisticSession: ChatSession = {
				sessionId,
				title,
				createdAt: new Date().toISOString(),
				lastActivity: new Date().toISOString(),
				isActive: true
			}

			queryClient.setQueryData(['chat-sessions', user.id], (old: ChatSession[] = []) => [
				optimisticSession,
				...old
			])

			createSessionMutation.mutate({ sessionId, title })
		}

		return sessionId
	}, [user, createSessionMutation, queryClient])

	const restoreSession = useCallback(async (sessionId: string, limit: number = 50) => {
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
	}, [restoreSessionMutation])

	const loadMoreMessages = useCallback(async (sessionId: string, cursor: number) => {
		try {
			const result = await restoreSessionMutation.mutateAsync({ sessionId, limit: 50, cursor })
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
	}, [restoreSessionMutation])

	const deleteSession = useCallback((sessionId: string) => {
		deleteSessionMutation.mutate(sessionId)
	}, [deleteSessionMutation])

	const updateSessionTitle = useCallback((sessionId: string, title: string) => {
		updateTitleMutation.mutate({ sessionId, title })
	}, [updateTitleMutation])

	const toggleSidebar = useCallback(() => {
		const newVisible = !sidebarVisible
		setSidebarVisible(newVisible)
		localStorage.setItem('llamaai-sidebar-hidden', String(!newVisible))
	}, [sidebarVisible])

	const generateSessionTitle = useCallback((firstMessage: string) => {
		return firstMessage.length > 40 ? firstMessage.substring(0, 40) + '...' : firstMessage
	}, [])

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
		createOptimisticSession,
		restoreSession,
		loadMoreMessages,
		deleteSession,
		updateSessionTitle,
		toggleSidebar,
		generateSessionTitle,
		isCreatingSession: createSessionMutation.isPending,
		isRestoringSession: restoreSessionMutation.isPending,
		isDeletingSession: deleteSessionMutation.isPending,
		isUpdatingTitle: updateTitleMutation.isPending
	}
}