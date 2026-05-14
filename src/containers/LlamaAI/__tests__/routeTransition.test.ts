import { describe, expect, it } from 'vitest'
import { isSameAgenticRouteTransition, shouldSkipCurrentSessionRouteRestore } from '../routeTransition'

describe('routeTransition', () => {
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
