import { useResearchUsage } from './useResearchUsage'
import { useSessionList } from './useSessionList'
import { useSessionMutations } from './useSessionMutations'
import { useSidebarVisibility } from './useSidebarVisibility'

// Re-export types for backward compatibility
export interface ChatSession {
	sessionId: string
	title: string
	createdAt: string
	lastActivity: string
	isActive: boolean
	isPublic?: boolean
	shareToken?: string
}

// oxlint-disable-next-line no-unused-vars
interface ConversationExchange {
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

// oxlint-disable-next-line no-unused-vars
interface PaginationState {
	hasMore: boolean
	isLoadingMore: boolean
	cursor?: number
	totalMessages?: number
}

export interface ResearchUsage {
	remainingUsage: number
	limit: number
	period: 'lifetime' | 'daily' | 'unlimited' | 'blocked'
	resetTime: string | null
}

/**
 * Unified hook for chat history management.
 * Composes useSessionList, useSessionMutations, useSidebarVisibility, and useResearchUsage.
 *
 * For new code, consider importing the individual hooks directly for better tree-shaking:
 * - useSessionList: Query sessions list
 * - useSessionMutations: Create, delete, update sessions
 * - useSidebarVisibility: Sidebar toggle state
 * - useResearchUsage: Research usage tracking
 */
export function useChatHistory() {
	const { sessions, researchUsage, isLoading, moveSessionToTop } = useSessionList()

	const {
		createFakeSession,
		restoreSession,
		loadMoreMessages,
		deleteSession,
		updateSessionTitle,
		isCreatingSession,
		isRestoringSession,
		isDeletingSession,
		isUpdatingTitle
	} = useSessionMutations()

	const { sidebarVisible, toggleSidebar } = useSidebarVisibility()

	const { decrementResearchUsage } = useResearchUsage()

	return {
		sessions,
		researchUsage,
		isLoading,
		sidebarVisible,
		createFakeSession,
		restoreSession,
		loadMoreMessages,
		deleteSession,
		updateSessionTitle,
		moveSessionToTop,
		decrementResearchUsage,
		toggleSidebar,
		isCreatingSession,
		isRestoringSession,
		isDeletingSession,
		isUpdatingTitle
	}
}
