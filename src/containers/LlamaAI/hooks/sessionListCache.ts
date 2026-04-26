import type { InfiniteData } from '@tanstack/react-query'
import type { ChatSession, ResearchUsage } from '~/containers/LlamaAI/types'

export const SESSIONS_QUERY_KEY = 'llamaai-sessions'

export interface SessionListData {
	sessions: ChatSession[]
	usage: ResearchUsage | null
}

export interface SessionListPage {
	sessions: ChatSession[]
	usage: ResearchUsage | null
	hasMore: boolean
	nextOffset?: number
}

export interface SessionListResponse {
	sessions: ChatSession[]
	hasMore?: boolean
	nextOffset?: number
	usage?: {
		research_report?: ResearchUsage | null
	}
}

export type SessionListInfiniteData = InfiniteData<SessionListPage, number>

export function mapSessionListPage(responseData: SessionListResponse): SessionListPage {
	return {
		sessions: responseData.sessions,
		usage: responseData.usage?.research_report || null,
		hasMore: responseData.hasMore ?? false,
		nextOffset: responseData.nextOffset
	}
}

export function flattenSessionListData(data: SessionListInfiniteData | undefined): SessionListData {
	if (!data) return { sessions: [], usage: null }

	const seenSessionIds = new Set<string>()
	const sessions: ChatSession[] = []

	for (const page of data.pages) {
		for (const session of page.sessions) {
			if (seenSessionIds.has(session.sessionId)) continue
			seenSessionIds.add(session.sessionId)
			sessions.push(session)
		}
	}

	return {
		sessions,
		usage: data.pages[0]?.usage ?? null
	}
}

export function createSessionListInfiniteData(page: SessionListPage): SessionListInfiniteData {
	return {
		pages: [page],
		pageParams: [0]
	}
}

export function mergeOptimisticSessions(
	page: SessionListPage,
	data: SessionListInfiniteData | undefined
): SessionListPage {
	if (!data) return page

	const realSessionIds = new Set<string>()
	for (const session of page.sessions) {
		realSessionIds.add(session.sessionId)
	}

	const optimisticSessions: ChatSession[] = []
	for (const existingPage of data.pages) {
		for (const session of existingPage.sessions) {
			if (!session.isOptimistic || realSessionIds.has(session.sessionId)) continue
			optimisticSessions.push(session)
		}
	}

	if (optimisticSessions.length === 0) return page

	return {
		...page,
		sessions: [...optimisticSessions, ...page.sessions]
	}
}

export function prependSessionToInfiniteData(
	data: SessionListInfiniteData | undefined,
	session: ChatSession
): SessionListInfiniteData {
	const page: SessionListPage = {
		sessions: [session],
		usage: null,
		hasMore: false
	}
	if (!data) return createSessionListInfiniteData(page)

	const withoutSession = removeSessionFromInfiniteData(data, session.sessionId) ?? data
	if (withoutSession.pages.length === 0) return createSessionListInfiniteData(page)

	const firstPage = withoutSession.pages[0]
	const pages = [...withoutSession.pages]
	pages[0] = {
		...firstPage,
		sessions: [session, ...firstPage.sessions]
	}

	return {
		...withoutSession,
		pages
	}
}

export function removeSessionsFromInfiniteData(
	data: SessionListInfiniteData | undefined,
	sessionIds: ReadonlySet<string>
): SessionListInfiniteData | undefined {
	if (!data) return data

	let changed = false
	const pages: SessionListPage[] = []

	for (const page of data.pages) {
		let pageChanged = false
		const sessions: ChatSession[] = []

		for (const session of page.sessions) {
			if (sessionIds.has(session.sessionId)) {
				pageChanged = true
				changed = true
				continue
			}
			sessions.push(session)
		}

		pages.push(pageChanged ? { ...page, sessions } : page)
	}

	if (!changed) return data
	return { ...data, pages }
}

export function removeSessionFromInfiniteData(
	data: SessionListInfiniteData | undefined,
	sessionId: string
): SessionListInfiniteData | undefined {
	if (!data) return data

	let changed = false
	const pages: SessionListPage[] = []

	for (const page of data.pages) {
		let pageChanged = false
		const sessions: ChatSession[] = []

		for (const session of page.sessions) {
			if (session.sessionId === sessionId) {
				pageChanged = true
				changed = true
				continue
			}
			sessions.push(session)
		}

		pages.push(pageChanged ? { ...page, sessions } : page)
	}

	if (!changed) return data
	return { ...data, pages }
}

export function updateSessionInInfiniteData(
	data: SessionListInfiniteData | undefined,
	sessionId: string,
	updateSession: (session: ChatSession) => ChatSession
): SessionListInfiniteData | undefined {
	if (!data) return data

	let changed = false
	const pages: SessionListPage[] = []

	for (const page of data.pages) {
		let pageChanged = false
		const sessions: ChatSession[] = []

		for (const session of page.sessions) {
			if (session.sessionId !== sessionId) {
				sessions.push(session)
				continue
			}

			pageChanged = true
			changed = true
			sessions.push(updateSession(session))
		}

		pages.push(pageChanged ? { ...page, sessions } : page)
	}

	if (!changed) return data
	return { ...data, pages }
}

export function moveSessionToTopInInfiniteData(
	data: SessionListInfiniteData | undefined,
	sessionId: string,
	lastActivity: string
): SessionListInfiniteData | undefined {
	if (!data) return data

	let movedSession: ChatSession | null = null
	const pages: SessionListPage[] = []

	for (const page of data.pages) {
		let pageChanged = false
		const sessions: ChatSession[] = []

		for (const session of page.sessions) {
			if (session.sessionId !== sessionId) {
				sessions.push(session)
				continue
			}

			pageChanged = true
			movedSession = {
				...session,
				lastActivity
			}
		}

		pages.push(pageChanged ? { ...page, sessions } : page)
	}

	if (!movedSession) return data

	const firstPage = pages[0] ?? { sessions: [], usage: null, hasMore: false }
	pages[0] = {
		...firstPage,
		sessions: [movedSession, ...firstPage.sessions]
	}

	return {
		...data,
		pages
	}
}
