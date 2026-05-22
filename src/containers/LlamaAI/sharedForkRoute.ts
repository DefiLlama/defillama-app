import type { LlamaAIRouteState } from '~/contexts/LlamaAIRouteState'

export function buildForkedSharedRoute(sessionId: string): LlamaAIRouteState {
	return { kind: 'chat-session', sessionId }
}

export function replaceSharedForkHistoryPath(
	sessionId: string,
	history: Pick<History, 'replaceState' | 'state'> = window.history
) {
	history.replaceState(history.state, '', `/ai/chat/${sessionId}`)
}
