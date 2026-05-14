export type AgenticRouteTransition =
	| { kind: 'new-chat' }
	| { kind: 'session'; sessionId: string; aroundMessageId?: string }
	| { kind: 'project'; projectId: string }

export function isSameAgenticRouteTransition(a: AgenticRouteTransition, b: AgenticRouteTransition) {
	if (a.kind !== b.kind) return false
	if (a.kind === 'new-chat' && b.kind === 'new-chat') return true
	if (a.kind === 'session' && b.kind === 'session') {
		return a.sessionId === b.sessionId && a.aroundMessageId === b.aroundMessageId
	}
	if (a.kind === 'project' && b.kind === 'project') return a.projectId === b.projectId
	return false
}

export function shouldSkipCurrentSessionRouteRestore(
	routeTransition: Extract<AgenticRouteTransition, { kind: 'session' }>,
	previousTransition: AgenticRouteTransition | null,
	currentSessionId: string | null
) {
	if (routeTransition.sessionId !== currentSessionId) return false
	if (routeTransition.aroundMessageId) return false
	return !(
		previousTransition?.kind === 'session' &&
		previousTransition.sessionId === routeTransition.sessionId &&
		previousTransition.aroundMessageId
	)
}
