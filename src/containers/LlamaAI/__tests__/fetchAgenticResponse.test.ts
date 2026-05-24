import { describe, expect, it, vi } from 'vitest'
import { parseSSEStream, type AgenticSSECallbacks } from '~/containers/LlamaAI/fetchAgenticResponse'

function sseReader(...events: string[]) {
	const encoder = new TextEncoder()
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(encoder.encode(events.map((event) => `data: ${event}\n\n`).join('')))
			controller.close()
		}
	})
	return stream.getReader()
}

function callbacks(): AgenticSSECallbacks {
	return {
		onToken: vi.fn(),
		onCharts: vi.fn(),
		onProgress: vi.fn(),
		onSpawnProgress: vi.fn(),
		onSessionId: vi.fn(),
		onCitations: vi.fn(),
		onDashboard: vi.fn(),
		onToolExecution: vi.fn(),
		onError: vi.fn(),
		onDone: vi.fn()
	}
}

describe('parseSSEStream', () => {
	it('dispatches event sequences and counts parsed events', async () => {
		const cb = callbacks()
		const eventCounter = { count: 0 }

		const result = await parseSSEStream(
			sseReader(
				JSON.stringify({ type: 'session', sessionId: 'session-1', startedAt: 123 }),
				JSON.stringify({ type: 'response_chunk', content: 'hello<bill />' }),
				JSON.stringify({ type: 'charts', charts: [], chartData: { rows: [] } }),
				JSON.stringify({ type: 'citations', citations: ['https://example.com'] }),
				JSON.stringify({ type: 'tool_execution', name: 'search', success: true }),
				JSON.stringify({ type: 'dashboard', dashboard_id: 'dash-1', dashboardConfig: { dashboardName: 'Dash' } }),
				JSON.stringify({ type: 'done' })
			),
			cb,
			undefined,
			eventCounter
		)

		expect(result).toEqual({ sawDone: true })
		expect(eventCounter.count).toBe(7)
		expect(cb.onSessionId).toHaveBeenCalledWith('session-1', 123)
		expect(cb.onToken).toHaveBeenCalledWith('hello')
		expect(cb.onCharts).toHaveBeenCalledWith([], { rows: [] })
		expect(cb.onCitations).toHaveBeenCalledWith(['https://example.com'])
		expect(cb.onToolExecution).toHaveBeenCalledWith({ type: 'tool_execution', name: 'search', success: true })
		expect(cb.onDashboard).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'dash-1', dashboardName: 'Dash', items: [] })
		)
		expect(cb.onDone).toHaveBeenCalledOnce()
	})

	it('reports streams that end without done', async () => {
		const cb = callbacks()

		const result = await parseSSEStream(sseReader(JSON.stringify({ type: 'response_chunk', content: 'partial' })), cb)

		expect(result).toEqual({ sawDone: false })
		expect(cb.onToken).toHaveBeenCalledWith('partial')
		expect(cb.onDone).not.toHaveBeenCalled()
	})
})
