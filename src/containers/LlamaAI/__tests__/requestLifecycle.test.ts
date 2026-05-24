import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	beginRequest,
	completeRequest,
	createRequestSettleState,
	isActiveRequest,
	waitForRequestSettle,
	type RequestKind
} from '~/containers/LlamaAI/requestLifecycle'

describe('requestLifecycle', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('begins and completes the active request', () => {
		const activeRequestIdRef = { current: 0 }
		const activeRequestKindRef = { current: 'idle' as RequestKind }
		const activeSessionIdRef = { current: null as string | null }

		const requestId = beginRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, 'prompt', 'session-1')

		expect(requestId).toBe(1)
		expect(isActiveRequest(activeRequestIdRef, requestId)).toBe(true)
		expect(activeRequestKindRef.current).toBe('prompt')
		expect(activeSessionIdRef.current).toBe('session-1')

		completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)

		expect(activeRequestKindRef.current).toBe('idle')
		expect(activeSessionIdRef.current).toBe(null)
	})

	it('does not complete stale requests', () => {
		const activeRequestIdRef = { current: 2 }
		const activeRequestKindRef = { current: 'prompt' as RequestKind }
		const activeSessionIdRef = { current: 'session-1' as string | null }

		completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, 1)

		expect(activeRequestKindRef.current).toBe('prompt')
		expect(activeSessionIdRef.current).toBe('session-1')
	})

	it('waits for request settle resolution or timeout', async () => {
		vi.useFakeTimers()
		const settled = createRequestSettleState(1)
		const resolved = waitForRequestSettle(settled, 5000)
		settled.resolve()
		await expect(resolved).resolves.toBeUndefined()

		const timedOut = waitForRequestSettle(createRequestSettleState(2), 10)
		await vi.advanceTimersByTimeAsync(10)
		await expect(timedOut).resolves.toBeUndefined()
	})
})
