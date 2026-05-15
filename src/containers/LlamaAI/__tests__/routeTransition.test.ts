import { describe, expect, it } from 'vitest'
import { isSameAgenticRouteTransition, shouldSkipCurrentSessionRouteRestore } from '../routeTransition'

describe('routeTransition', () => {
	it('compares new-chat and project transitions by kind and identity', () => {
		expect(isSameAgenticRouteTransition({ kind: 'new-chat' }, { kind: 'new-chat' })).toBe(true)
		expect(
			isSameAgenticRouteTransition(
				{ kind: 'project', projectId: 'project-1' },
				{ kind: 'project', projectId: 'project-1' }
			)
		).toBe(true)
		expect(
			isSameAgenticRouteTransition(
				{ kind: 'project', projectId: 'project-1' },
				{ kind: 'project', projectId: 'project-2' }
			)
		).toBe(false)
		expect(isSameAgenticRouteTransition({ kind: 'new-chat' }, { kind: 'project', projectId: 'project-1' })).toBe(false)
	})

	it('treats different route transition kinds as different', () => {
		expect(
			isSameAgenticRouteTransition(
				{ kind: 'session', sessionId: 'session-1' },
				{ kind: 'project', projectId: 'project-1' }
			)
		).toBe(false)
	})

	it('treats message anchors as part of session route identity', () => {
		expect(
			isSameAgenticRouteTransition(
				{ kind: 'session', sessionId: 'session-1', aroundMessageId: 'message-a' },
				{ kind: 'session', sessionId: 'session-1', aroundMessageId: 'message-b' }
			)
		).toBe(false)

		expect(
			isSameAgenticRouteTransition(
				{ kind: 'session', sessionId: 'session-1', aroundMessageId: 'message-a' },
				{ kind: 'session', sessionId: 'session-1', aroundMessageId: 'message-a' }
			)
		).toBe(true)
	})

	it('skips redundant current-session restores without anchors', () => {
		expect(
			shouldSkipCurrentSessionRouteRestore(
				{ kind: 'session', sessionId: 'session-1' },
				{ kind: 'session', sessionId: 'session-1' },
				'session-1'
			)
		).toBe(true)
	})

	it('does not skip restore without a previous transition', () => {
		expect(shouldSkipCurrentSessionRouteRestore({ kind: 'session', sessionId: 'session-1' }, null, 'session-1')).toBe(
			false
		)
	})

	it('does not skip restore for a different current session', () => {
		expect(
			shouldSkipCurrentSessionRouteRestore(
				{ kind: 'session', sessionId: 'session-1' },
				{ kind: 'session', sessionId: 'session-2' },
				'session-1'
			)
		).toBe(false)
	})

	it('restores when removing a same-session message anchor', () => {
		expect(
			shouldSkipCurrentSessionRouteRestore(
				{ kind: 'session', sessionId: 'session-1' },
				{ kind: 'session', sessionId: 'session-1', aroundMessageId: 'message-a' },
				'session-1'
			)
		).toBe(false)
	})

	it('restores when adding a same-session message anchor', () => {
		expect(
			shouldSkipCurrentSessionRouteRestore(
				{ kind: 'session', sessionId: 'session-1', aroundMessageId: 'message-a' },
				{ kind: 'session', sessionId: 'session-1' },
				'session-1'
			)
		).toBe(false)
	})
})
