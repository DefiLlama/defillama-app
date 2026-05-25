import { describe, expect, it, vi } from 'vitest'
import { AI_SERVER } from '~/constants'
import {
	fetchAgenticResponse,
	parseSSEStream,
	type AgenticSSECallbacks
} from '~/containers/LlamaAI/fetchAgenticResponse'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'

type MockFetch = (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => Promise<Response>
type MockFetchSpy = ReturnType<typeof vi.fn<MockFetch>>

const chartConfig: ChartConfiguration = {
	id: 'chart-1',
	type: 'line',
	title: 'TVL',
	description: 'TVL over time',
	axes: {
		x: { field: 'timestamp', label: 'Date', type: 'time' },
		yAxes: [{ id: 'left', fields: ['tvl'], label: 'TVL', position: 'left' }]
	},
	series: [
		{
			name: 'TVL',
			type: 'line',
			yAxisId: 'left',
			metricClass: 'stock',
			dataMapping: { xField: 'timestamp', yField: 'tvl' },
			styling: {}
		}
	],
	dataTransformation: { timeField: 'timestamp', metrics: ['tvl'] }
}

function encodeSseEvents(events: string[]) {
	return events.map((event) => `data: ${event}\n\n`).join('')
}

function sseReader(...events: string[]) {
	const encoder = new TextEncoder()
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(encoder.encode(encodeSseEvents(events)))
			controller.close()
		}
	})
	return stream.getReader()
}

function sseResponse(events: string[], init?: ResponseInit) {
	return new Response(encodeSseEvents(events), {
		...init,
		headers: {
			'Content-Type': 'text/event-stream',
			...init?.headers
		}
	})
}

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers
		}
	})
}

function readRequestBody(fetchSpy: MockFetchSpy) {
	const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined
	if (!init || typeof init.body !== 'string') throw new Error('Expected JSON request body')
	return JSON.parse(init.body) as Record<string, unknown>
}

function callbacks(): AgenticSSECallbacks {
	return {
		onToken: vi.fn(),
		onCharts: vi.fn(),
		onGeneratedImages: vi.fn(),
		onProgress: vi.fn(),
		onSpawnProgress: vi.fn(),
		onSessionId: vi.fn(),
		onCitations: vi.fn(),
		onCsvExport: vi.fn(),
		onMdExport: vi.fn(),
		onAlertProposed: vi.fn(),
		onDashboard: vi.fn(),
		onToolExecution: vi.fn(),
		onTodos: vi.fn(),
		onMessageMetadata: vi.fn(),
		onThinking: vi.fn(),
		onCompaction: vi.fn(),
		onTitle: vi.fn(),
		onMessageId: vi.fn(),
		onUserMessageId: vi.fn(),
		onSiblingInfo: vi.fn(),
		onTokenLimit: vi.fn(),
		onContextWarning: vi.fn(),
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
				JSON.stringify({
					type: 'dashboard',
					dashboard_id: 'dash-1',
					dashboardConfig: { dashboardName: 'Dash', items: [] }
				}),
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

	it('preserves nested dashboard chart payloads', async () => {
		const cb = callbacks()
		const chartData = {
			'chart-1': {
				config: chartConfig,
				data: [{ timestamp: 1, tvl: 100 }],
				toolChain: [{ name: 'generate_chart' }]
			}
		}

		await parseSSEStream(
			sseReader(
				JSON.stringify({
					type: 'dashboard',
					content: {
						dashboard_id: 'dash-1',
						dashboardConfig: {
							dashboardName: 'Nested dashboard',
							items: [{ kind: 'llamaai-chart', chartRef: 'chart-1', title: 'TVL' }]
						},
						chartData
					}
				})
			),
			cb
		)

		expect(cb.onDashboard).toHaveBeenCalledWith({
			id: 'dash-1',
			dashboardName: 'Nested dashboard',
			items: [{ kind: 'llamaai-chart', chartRef: 'chart-1', title: 'TVL' }],
			chartData
		})
	})

	it('normalizes malformed optional SSE fields instead of aborting the stream', async () => {
		const cb = callbacks()

		const result = await parseSSEStream(
			sseReader(
				JSON.stringify({ type: 'response_chunk', content: 123 }),
				JSON.stringify({
					type: 'charts',
					charts: [chartConfig, { id: 'bad' }],
					chartData: [{ timestamp: 1, tvl: 100 }]
				}),
				JSON.stringify({ type: 'generated_images' }),
				JSON.stringify({ type: 'csv_export', exports: {} }),
				JSON.stringify({ type: 'md_export', exports: null }),
				JSON.stringify({ type: 'citations' }),
				JSON.stringify({ type: 'todo_snapshot' }),
				JSON.stringify({
					type: 'alert_proposed',
					content: {
						alertId: 'alert-1',
						title: 'Fee alert',
						alertIntent: { deliveryChannel: 'slack', slackTeamId: 'T1', slackChannelName: 'alerts' }
					}
				}),
				JSON.stringify({
					type: 'dashboard',
					dashboardConfig: {},
					chartData: {
						'chart-1': {
							config: chartConfig,
							data: [{ timestamp: 1, tvl: 100 }],
							toolChain: 'legacy-bad-tool-chain'
						},
						malformed: { config: { id: 'bad' }, data: [{ timestamp: 2, tvl: 200 }] }
					}
				}),
				JSON.stringify({ type: 'done' })
			),
			cb
		)

		expect(result).toEqual({ sawDone: true })
		expect(cb.onToken).not.toHaveBeenCalled()
		expect(cb.onCharts).toHaveBeenCalledWith([chartConfig], { 'chart-1': [{ timestamp: 1, tvl: 100 }] })
		expect(cb.onGeneratedImages).toHaveBeenCalledWith([])
		expect(cb.onCsvExport).toHaveBeenCalledWith([])
		expect(cb.onMdExport).toHaveBeenCalledWith([])
		expect(cb.onCitations).toHaveBeenCalledWith([])
		expect(cb.onTodos).toHaveBeenCalledWith([])
		expect(cb.onAlertProposed).toHaveBeenCalledWith({
			alertId: 'alert-1',
			title: 'Fee alert',
			alertIntent: {
				frequency: 'daily',
				hour: 9,
				timezone: 'UTC',
				dayOfWeek: undefined,
				deliveryChannel: 'slack',
				slackTeamId: 'T1',
				slackTeamName: null,
				slackChannelId: null,
				slackChannelName: 'alerts'
			},
			schedule_expression: '',
			next_run_at: ''
		})
		expect(cb.onDashboard).toHaveBeenCalledWith({
			id: 'dashboard_Dashboard__0',
			dashboardName: 'Dashboard',
			items: [],
			chartData: {
				'chart-1': {
					config: chartConfig,
					data: [{ timestamp: 1, tvl: 100 }],
					toolChain: []
				}
			}
		})
	})
})

describe('fetchAgenticResponse', () => {
	it('posts the agentic request and dispatches the streamed response contract', async () => {
		const cb = callbacks()
		const eventCounter = { count: 0 }
		const fetchFn = vi.fn<MockFetch>(async () =>
			sseResponse([
				JSON.stringify({ type: 'session', sessionId: 'session-1', startedAt: 123 }),
				JSON.stringify({ type: 'response_chunk', content: 'hello<bill />' }),
				JSON.stringify({
					type: 'charts',
					charts: [chartConfig],
					chartData: {
						'chart-1': [{ timestamp: 1, tvl: 100 }],
						'chart-2': [{ timestamp: 2, tvl: 200 }]
					}
				}),
				JSON.stringify({
					type: 'dashboard',
					dashboard_id: 'dash-1',
					dashboardConfig: {
						dashboardName: 'Protocol dashboard',
						items: [{ kind: 'llamaai-chart', chartRef: 'chart-1', title: 'TVL' }],
						timePeriod: '30d',
						sourceDashboardId: 'source-1'
					},
					chartData: {
						'chart-1': {
							config: chartConfig,
							data: [{ timestamp: 1, tvl: 100 }],
							toolChain: [{ name: 'generate_chart' }]
						}
					}
				}),
				JSON.stringify({ type: 'citations', citations: ['https://example.com'] }),
				JSON.stringify({ type: 'tool_execution', name: 'search', success: true }),
				JSON.stringify({ type: 'done' })
			])
		)

		await fetchAgenticResponse({
			message: 'Build a chart',
			sessionId: 'session-1',
			callbacks: cb,
			researchMode: true,
			enablePremiumTools: true,
			entities: [{ term: 'Ethereum', slug: 'ethereum', type: 'chain' }],
			images: [],
			pageContext: { entitySlug: 'ethereum', entityType: 'chain', route: '/chain/ethereum' },
			isSuggestedQuestion: true,
			blockedSkills: [],
			model: 'gpt-5',
			effort: 'high',
			shareToken: 'share-1',
			editMessageId: 'message-1',
			projectId: 'project-1',
			fetchFn: fetchFn as unknown as typeof fetch,
			eventCounter
		})

		expect(fetchFn).toHaveBeenCalledOnce()
		expect(fetchFn.mock.calls[0]?.[0]).toBe(`${AI_SERVER}/agentic`)
		const init = fetchFn.mock.calls[0]?.[1] as RequestInit
		expect(init.method).toBe('POST')
		expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
		const body = readRequestBody(fetchFn)
		expect(body).toMatchObject({
			message: 'Build a chart',
			stream: true,
			sessionId: 'session-1',
			researchMode: true,
			enablePremiumTools: true,
			entities: [{ term: 'Ethereum', slug: 'ethereum', type: 'chain' }],
			pageContext: { entitySlug: 'ethereum', entityType: 'chain', route: '/chain/ethereum' },
			isSuggestedQuestion: true,
			model: 'gpt-5',
			effort: 'high',
			shareToken: 'share-1',
			editMessageId: 'message-1',
			projectId: 'project-1'
		})
		expect(typeof body.timezone).toBe('string')
		expect(body).not.toHaveProperty('images')
		expect(body).not.toHaveProperty('blockedSkills')

		expect(eventCounter.count).toBe(7)
		expect(cb.onSessionId).toHaveBeenCalledWith('session-1', 123)
		expect(cb.onToken).toHaveBeenCalledWith('hello')
		expect(cb.onCharts).toHaveBeenCalledWith([chartConfig], {
			'chart-1': [{ timestamp: 1, tvl: 100 }],
			'chart-2': [{ timestamp: 2, tvl: 200 }]
		})
		expect(cb.onDashboard).toHaveBeenCalledWith({
			id: 'dash-1',
			dashboardName: 'Protocol dashboard',
			items: [{ kind: 'llamaai-chart', chartRef: 'chart-1', title: 'TVL' }],
			timePeriod: '30d',
			sourceDashboardId: 'source-1',
			chartData: {
				'chart-1': {
					config: chartConfig,
					data: [{ timestamp: 1, tvl: 100 }],
					toolChain: [{ name: 'generate_chart' }]
				}
			}
		})
		expect(cb.onCitations).toHaveBeenCalledWith(['https://example.com'])
		expect(cb.onToolExecution).toHaveBeenCalledWith({ type: 'tool_execution', name: 'search', success: true })
		expect(cb.onDone).toHaveBeenCalledOnce()
	})

	it('turns a successful stream without done into a reconnectable failure unless aborted', async () => {
		const cb = callbacks()
		const fetchFn = vi.fn<MockFetch>(async () =>
			sseResponse([JSON.stringify({ type: 'response_chunk', content: 'partial' })])
		)

		await expect(
			fetchAgenticResponse({
				message: 'Continue',
				callbacks: cb,
				enablePremiumTools: false,
				fetchFn: fetchFn as unknown as typeof fetch
			})
		).rejects.toThrow('Stream ended without done event')

		expect(cb.onToken).toHaveBeenCalledWith('partial')
		expect(cb.onDone).not.toHaveBeenCalled()

		const aborted = new AbortController()
		aborted.abort()
		await expect(
			fetchAgenticResponse({
				message: 'Continue',
				callbacks: callbacks(),
				abortSignal: aborted.signal,
				enablePremiumTools: false,
				fetchFn: fetchFn as unknown as typeof fetch
			})
		).resolves.toBeUndefined()
	})

	it('preserves backend limit error details', async () => {
		const freeLimitFetch = vi.fn<MockFetch>(async () =>
			jsonResponse(
				{
					code: 'FREE_DAILY_LIMIT',
					content: 'Daily free limit reached',
					upgradeUrl: 'https://defillama.com/pro',
					details: { period: 'daily', limit: 5, resetTime: '2026-05-24T00:00:00.000Z' }
				},
				{ status: 403 }
			)
		)

		await expect(
			fetchAgenticResponse({
				message: 'Question',
				callbacks: callbacks(),
				enablePremiumTools: false,
				fetchFn: freeLimitFetch as unknown as typeof fetch
			})
		).rejects.toMatchObject({
			message: 'Daily free limit reached',
			code: 'FREE_DAILY_LIMIT',
			upgradeUrl: 'https://defillama.com/pro',
			details: { period: 'daily', limit: 5, resetTime: '2026-05-24T00:00:00.000Z' }
		})

		const usageLimitFetch = vi.fn<MockFetch>(async () =>
			jsonResponse(
				{
					code: 'USAGE_LIMIT_EXCEEDED',
					content: 'Usage limit reached',
					details: { period: 'monthly', limit: 100, resetTime: null }
				},
				{ status: 403 }
			)
		)

		await expect(
			fetchAgenticResponse({
				message: 'Question',
				callbacks: callbacks(),
				enablePremiumTools: false,
				fetchFn: usageLimitFetch as unknown as typeof fetch
			})
		).rejects.toMatchObject({
			message: 'Usage limit reached',
			code: 'USAGE_LIMIT_EXCEEDED',
			details: { period: 'monthly', limit: 100, resetTime: null }
		})
	})
})
