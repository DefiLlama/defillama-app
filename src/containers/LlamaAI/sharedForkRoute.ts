import type { SessionId } from '~/containers/LlamaAI/ids'
import type { LlamaAIRouteState } from '~/contexts/LlamaAIRouteState'

export function buildForkedSharedRoute(sessionId: SessionId): LlamaAIRouteState {
	return { kind: 'chat-session', sessionId }
}

export function replaceSharedForkHistoryPath(
	sessionId: SessionId,
	history: Pick<History, 'replaceState' | 'state'> = window.history
) {
	history.replaceState(history.state, '', `/ai/chat/${sessionId}`)
}
