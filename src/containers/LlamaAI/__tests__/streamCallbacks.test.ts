import { describe, expect, it, vi } from 'vitest'
import { createAgenticCallbacks } from '~/containers/LlamaAI/streamCallbacks'
import { createStreamBuffer, type StreamDispatch } from '~/containers/LlamaAI/streamState'

function setupCallbacks(activeRequestId = 1, requestId = 1, deferEmptyDone = false) {
	const buffer = createStreamBuffer()
	const dispatch = vi.fn() as unknown as StreamDispatch
	const appendMessage = vi.fn()
	const notify = vi.fn()
	const currentMessageIdRef = { current: 'assistant-1' }

	const callbacks = createAgenticCallbacks({
		requestId,
		activeRequestIdRef: { current: activeRequestId },
		buffer,
		dispatch,
		currentMessageIdRef,
		toolCallIdRef: { current: 0 },
		appendMessage,
		deferEmptyDone,
		notify
	})

	return { appendMessage, buffer, callbacks, currentMessageIdRef, dispatch, notify }
}

describe('createAgenticCallbacks', () => {
	it('ignores stale request events', () => {
		const { appendMessage, buffer, callbacks, dispatch, notify } = setupCallbacks(2, 1)

		callbacks.onToken('hello')
		callbacks.onDone()

		expect(buffer.text).toBe('')
		expect(dispatch).not.toHaveBeenCalled()
		expect(appendMessage).not.toHaveBeenCalled()
		expect(notify).not.toHaveBeenCalled()
	})

	it('updates buffer and dispatches live stream actions', () => {
		const { appendMessage, buffer, callbacks, currentMessageIdRef, dispatch, notify } = setupCallbacks()

		callbacks.onToken('[REPORT_START]hello')
		callbacks.onCitations(['https://example.com', 'https://example.com'])
		callbacks.onDone()

		expect(buffer.text).toBe('hello')
		expect(buffer.citations).toEqual(['https://example.com'])
		expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_ACTIVITY' })
		expect(dispatch).toHaveBeenCalledWith({ type: 'APPEND_TOKEN', value: '[REPORT_START]hello' })
		expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_STREAM' })
		expect(appendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				role: 'assistant',
				content: 'hello',
				id: 'assistant-1'
			})
		)
		expect(currentMessageIdRef.current).toBeNull()
		expect(notify).toHaveBeenCalledOnce()
	})

	it('defers empty done events when requested', () => {
		const { appendMessage, callbacks, dispatch, notify } = setupCallbacks(1, 1, true)

		callbacks.onDone()

		expect(appendMessage).not.toHaveBeenCalled()
		expect(dispatch).not.toHaveBeenCalledWith({ type: 'RESET_STREAM' })
		expect(notify).not.toHaveBeenCalled()
	})
})
