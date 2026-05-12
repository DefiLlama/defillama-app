import { useRouter } from 'next/router'
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react'

export type LlamaAIRouteState =
	| { kind: 'chat-new' }
	| { kind: 'chat-session'; sessionId: string; initialPrompt?: string; shareToken?: string }
	| { kind: 'project'; projectId: string; initialTab: 'chats' | 'sources' }
	| { kind: 'unknown' }

const LlamaAIRouteContext = createContext<LlamaAIRouteState>({ kind: 'unknown' })

function firstString(value: string | string[] | undefined) {
	if (typeof value === 'string') return value
	return Array.isArray(value) ? value[0] : undefined
}

export function useLlamaAIRouteState(): LlamaAIRouteState {
	const router = useRouter()

	return useMemo(() => {
		if (!router.isReady) return { kind: 'unknown' }

		if (router.pathname === '/ai/chat') {
			return { kind: 'chat-new' }
		}

		if (router.pathname === '/ai/chat/[sessionId]') {
			const sessionId = firstString(router.query.sessionId)
			if (!sessionId) return { kind: 'unknown' }

			return {
				kind: 'chat-session',
				sessionId,
				initialPrompt: firstString(router.query.prompt),
				shareToken: firstString(router.query.shareToken)
			}
		}

		if (router.pathname === '/ai/projects/[id]') {
			const projectId = firstString(router.query.id)
			if (!projectId) return { kind: 'unknown' }
			const tab = firstString(router.query.tab)

			return {
				kind: 'project',
				projectId,
				initialTab: tab === 'sources' ? 'sources' : 'chats'
			}
		}

		return { kind: 'unknown' }
	}, [
		router.isReady,
		router.pathname,
		router.query.sessionId,
		router.query.prompt,
		router.query.shareToken,
		router.query.id,
		router.query.tab
	])
}

export function LlamaAIRouteProvider({ value, children }: PropsWithChildren<{ value: LlamaAIRouteState }>) {
	return <LlamaAIRouteContext.Provider value={value}>{children}</LlamaAIRouteContext.Provider>
}

export function useLlamaAIRouteContext() {
	return useContext(LlamaAIRouteContext)
}
