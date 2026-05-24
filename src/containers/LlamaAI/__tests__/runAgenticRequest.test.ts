import { describe, expect, it, vi } from 'vitest'
import { toSessionId } from '~/containers/LlamaAI/ids'
import type { RequestKind, RequestSettleState } from '~/containers/LlamaAI/requestLifecycle'
import { runAgenticRequest } from '~/containers/LlamaAI/runAgenticRequest'

function refs() {
	return {
		activeRequestIdRef: { current: 0 },
		activeRequestKindRef: { current: 'idle' as RequestKind },
		activeSessionIdRef: { current: null as string | null },
		abortControllerRef: { current: null as AbortController | null },
		activeRequestSettleRef: { current: null as RequestSettleState }
	}
}

describe('runAgenticRequest', () => {
	it('creates callbacks, runs the request, and cleans up active lifecycle state', async () => {
		const state = refs()
		const onToken = vi.fn()
		const execute = vi.fn(async ({ callbacks }) => {
			callbacks.onToken('hello')
		})

		const context = await runAgenticRequest({
			mode: 'prompt',
			sessionId: toSessionId('session-1'),
			requestKind: 'prompt',
			...state,
			createCallbacks: () => ({
				onToken,
				onCharts: vi.fn(),
				onProgress: vi.fn(),
				onSpawnProgress: vi.fn(),
				onSessionId: vi.fn(),
				onCitations: vi.fn(),
				onError: vi.fn(),
				onDone: vi.fn()
			}),
			execute
		})

		expect(context.requestId).toBe(1)
		expect(execute).toHaveBeenCalledOnce()
		expect(onToken).toHaveBeenCalledWith('hello')
		expect(state.activeRequestKindRef.current).toBe('idle')
		expect(state.activeSessionIdRef.current).toBeNull()
		expect(state.abortControllerRef.current).toBeNull()
		expect(state.activeRequestSettleRef.current).toBeNull()
	})

	it('classifies abort, usage, free-limit, temporary connectivity, and generic failures', async () => {
		const cases = [
			{ error: Object.assign(new Error('aborted'), { name: 'AbortError' }), kind: 'abort' },
			{ error: Object.assign(new Error('upgrade'), { code: 'FREE_DAILY_LIMIT' }), kind: 'free-limit' },
			{ error: Object.assign(new Error('usage'), { code: 'USAGE_LIMIT_EXCEEDED' }), kind: 'usage-limit' },
			{ error: new Error('Stream ended without done event'), kind: 'temporary-connectivity' },
			{ error: new Error('other'), kind: 'failure' }
		] as const

		for (const testCase of cases) {
			const state = refs()
			const onError = vi.fn()
			await runAgenticRequest({
				mode: 'prompt',
				sessionId: toSessionId('session-1'),
				requestKind: 'prompt',
				...state,
				createCallbacks: () => ({
					onToken: vi.fn(),
					onCharts: vi.fn(),
					onProgress: vi.fn(),
					onSpawnProgress: vi.fn(),
					onSessionId: vi.fn(),
					onCitations: vi.fn(),
					onError: vi.fn(),
					onDone: vi.fn()
				}),
				execute: async () => {
					throw testCase.error
				},
				onError
			})

			expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: testCase.kind }), expect.any(Object))
		}
	})

	it('starts detached requests without waiting for completion', async () => {
		const state = refs()
		let finish!: () => void
		const pending = new Promise<void>((resolve) => {
			finish = resolve
		})
		const onFinally = vi.fn()

		await runAgenticRequest({
			mode: 'resume',
			sessionId: toSessionId('session-1'),
			requestKind: 'resume',
			...state,
			detached: true,
			createCallbacks: () => ({
				onToken: vi.fn(),
				onCharts: vi.fn(),
				onProgress: vi.fn(),
				onSpawnProgress: vi.fn(),
				onSessionId: vi.fn(),
				onCitations: vi.fn(),
				onError: vi.fn(),
				onDone: vi.fn()
			}),
			execute: () => pending,
			onFinally
		})

		expect(state.activeRequestKindRef.current).toBe('resume')
		expect(onFinally).not.toHaveBeenCalled()
		finish()
		await pending
		await vi.waitFor(() => expect(onFinally).toHaveBeenCalledOnce())
		expect(state.activeRequestKindRef.current).toBe('idle')
	})
})
