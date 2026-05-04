import type { NextApiRequest } from 'next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'
import { fetchJson } from './async'
import { fetchWithPoolingOnServer } from './http-client'
import {
	buildStaticRouteRequestPath,
	flushTelemetry,
	recordDomainEvent,
	recordTelemetry,
	staticRouteTelemetryAttributes,
	telemetryTest,
	withApiRouteTelemetry,
	withRouteTelemetry,
	withServerSidePropsTelemetry,
	withStaticRouteTelemetry,
	type TelemetryEvent
} from './telemetry'

function runtimeError(message: string): TelemetryEvent {
	return {
		type: 'runtime_error',
		phase: 'unknown',
		occurred_at: new Date().toISOString(),
		error_message: message
	}
}

function useTelemetryEnv() {
	vi.stubEnv('OPS_TELEMETRY_URL', 'test-ingest-url')
	vi.stubEnv('OPS_TELEMETRY_TOKEN', 'secret')
	vi.stubEnv('OPS_TELEMETRY_BATCH_SIZE', '100')
	vi.stubEnv('OPS_TELEMETRY_QUEUE_MAX', '100')
	vi.stubEnv('OPS_TELEMETRY_SEND_TIMEOUT_MS', '100')
	vi.stubEnv('OPS_TELEMETRY_CIRCUIT_COOLDOWN_MS', '1000')
}

function sentBatch(fetchMock: ReturnType<typeof vi.fn>) {
	const batches = sentBatches(fetchMock)
	return batches[batches.length - 1]
}

function sentBatches(fetchMock: ReturnType<typeof vi.fn>) {
	return fetchMock.mock.calls
		.filter(([url]) => url === process.env.OPS_TELEMETRY_URL)
		.map(([, init]) => JSON.parse(String((init as RequestInit).body)))
}

function sentEvents(fetchMock: ReturnType<typeof vi.fn>): TelemetryEvent[] {
	const batches = sentBatches(fetchMock)
	return batches.flatMap((batch) => batch.events)
}

function ssrContext(path: string, statusCode = 200, params?: Record<string, string>, query?: Record<string, string>) {
	return {
		req: { method: 'GET' },
		res: { statusCode },
		resolvedUrl: path,
		params,
		query
	} as any
}

function apiRequest(method: string, url: string) {
	const parsed = new URL(url, 'http://localhost')
	const query: Record<string, string> = {}
	for (const [key, value] of parsed.searchParams) {
		query[key] = value
	}
	return { method, url, query } as NextApiRequest
}

describe('telemetry client', () => {
	beforeEach(() => {
		telemetryTest.reset()
		useTelemetryEnv()
	})

	afterEach(() => {
		telemetryTest.reset()
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it('drops oldest queued events when the queue cap is exceeded', async () => {
		vi.stubEnv('OPS_TELEMETRY_QUEUE_MAX', '3')
		const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		recordTelemetry(runtimeError('first'))
		recordTelemetry(runtimeError('second'))
		recordTelemetry(runtimeError('third'))
		recordTelemetry(runtimeError('fourth'))
		await flushTelemetry({ timeoutMs: 1000 })

		const batch = sentBatch(fetchMock)
		expect(
			batch.events.map((event: TelemetryEvent) => (event.type === 'runtime_error' ? event.error_message : ''))
		).toEqual(['second', 'third', 'fourth'])
		const firstCall = fetchMock.mock.calls[0]!
		const firstInit = firstCall[1]
		if (!firstInit) throw new Error('missing telemetry request init')
		expect(firstCall[0]).toBe(process.env.OPS_TELEMETRY_URL)
		expect(firstInit.headers).toMatchObject({
			Authorization: 'Bearer secret',
			'Idempotency-Key': expect.any(String)
		})
	})

	it('reuses the idempotency key for retries and opens the circuit after failures', async () => {
		const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 500 }))
		vi.stubGlobal('fetch', fetchMock)

		recordTelemetry(runtimeError('retry me'))
		await flushTelemetry({ timeoutMs: 1000 })
		await flushTelemetry({ timeoutMs: 1000 })
		await flushTelemetry({ timeoutMs: 1000 })
		await flushTelemetry({ timeoutMs: 1000 })

		const firstCall = fetchMock.mock.calls[0]!
		const secondCall = fetchMock.mock.calls[1]!
		const thirdCall = fetchMock.mock.calls[2]!
		const firstInit = firstCall[1]
		const secondInit = secondCall[1]
		const thirdInit = thirdCall[1]
		if (!firstInit || !secondInit || !thirdInit) throw new Error('missing telemetry request init')
		const firstHeaders = firstInit.headers as Record<string, string>
		const secondHeaders = secondInit.headers as Record<string, string>
		const thirdHeaders = thirdInit.headers as Record<string, string>

		expect(fetchMock).toHaveBeenCalledTimes(3)
		expect(firstHeaders['Idempotency-Key']).toBe(secondHeaders['Idempotency-Key'])
		expect(secondHeaders['Idempotency-Key']).toBe(thirdHeaders['Idempotency-Key'])
		expect(telemetryTest.retryBatchEvents()).toBe(1)
		expect(telemetryTest.circuitOpenUntil()).toBeGreaterThan(Date.now())
	})

	it('creates unique static route traces and page build finish ticks', async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		expect(buildStaticRouteRequestPath('chain/[chain]', { chain: 'ethereum' })).toBe('/chain/ethereum')
		expect(buildStaticRouteRequestPath('/chain/[chain]', { chain: 'ethereum' })).toBe('/chain/ethereum')

		await withStaticRouteTelemetry(
			'/chain/[chain]',
			async () => ({ props: { ok: true } }),
			staticRouteTelemetryAttributes({ chain: 'ethereum' }),
			buildStaticRouteRequestPath('/chain/[chain]', { chain: 'ethereum' })
		)
		await withStaticRouteTelemetry('/second', async () => ({ props: { ok: true } }))

		const events = sentEvents(fetchMock)
		const routes = events.filter((event) => event.type === 'route_execution')
		const ticks = events.filter((event) => event.type === 'page_build_finish_tick')

		expect(routes).toHaveLength(2)
		expect(ticks).toHaveLength(2)
		expect(routes[0].trace_id).not.toBe(routes[1].trace_id)
		expect(routes[0]).toMatchObject({
			route: '/chain/[chain]',
			request_path: '/chain/ethereum',
			attributes: { params: { chain: 'ethereum' } }
		})
		expect(ticks[0]).toMatchObject({
			parent_span_id: routes[0].span_id,
			route: '/chain/[chain]',
			attributes: { params: { chain: 'ethereum' } }
		})
		expect(ticks[1]).toMatchObject({ parent_span_id: routes[1].span_id, route: '/second' })
	})

	it('marks large page build finish gaps', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-04-27T00:00:00.000Z'))
		vi.stubEnv('OPS_TELEMETRY_LARGE_PAGE_BUILD_GAP_MS', '30000')
		const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		await withStaticRouteTelemetry('/first', async () => ({ props: {} }))
		vi.setSystemTime(new Date('2026-04-27T00:00:31.000Z'))
		await withStaticRouteTelemetry('/second', async () => ({ props: {} }))
		vi.useRealTimers()

		const ticks = sentEvents(fetchMock).filter((event) => event.type === 'page_build_finish_tick')
		expect(ticks[1]).toMatchObject({
			route: '/second',
			gap_ms: 31000,
			attributes: { large_gap: true }
		})
	})

	it('records server-side props telemetry with request path, status, props size, and errors', async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		const success = withServerSidePropsTelemetry('/ssr/[id]', async () => ({ props: { id: 'abc' } }))
		await success(ssrContext('/ssr/abc?tab=one', 202, { id: 'abc' }, { id: 'abc', tab: 'one' }))

		const failure = withServerSidePropsTelemetry('/ssr/error', async () => {
			throw new Error('ssr failed')
		})
		await expect(failure(ssrContext('/ssr/error', 500))).rejects.toThrow('ssr failed')

		const events = sentEvents(fetchMock)
		const successRoute = events.find((event) => event.type === 'route_execution' && event.route === '/ssr/[id]')
		const errorRoute = events.find((event) => event.type === 'route_execution' && event.route === '/ssr/error')
		const ssrRuntimeError = events.find((event) => event.type === 'runtime_error' && event.route === '/ssr/error')

		expect(successRoute).toMatchObject({
			operation_type: 'getServerSideProps',
			request_path: '/ssr/abc?tab=one',
			http_status: 202,
			status: 'success',
			attributes: { params: { id: 'abc' }, query: { id: 'abc', tab: 'one' }, props_bytes: 12 }
		})
		expect(errorRoute).toMatchObject({
			operation_type: 'getServerSideProps',
			status: 'error',
			error_message: 'ssr failed'
		})
		expect(ssrRuntimeError).toMatchObject({
			phase: 'getServerSideProps',
			error_message: 'ssr failed',
			parent_span_id: errorRoute?.span_id
		})
	})

	it('sanitizes server-side props request paths, params, and query attributes', async () => {
		vi.stubEnv('API_KEY', 'ssr-secret')
		const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		const success = withServerSidePropsTelemetry('/ssr/[id]', async () => ({ props: {} }))
		await success(
			ssrContext(
				'/ssr/abcdefghijklmnopqrstuvwxyz123456?api_key=ssr-secret&chain=ethereum',
				200,
				{ id: 'abcdefghijklmnopqrstuvwxyz123456', token: 'ssr-secret' },
				{ api_key: 'ssr-secret', chain: 'ethereum' }
			)
		)

		const route = sentEvents(fetchMock).find((event) => event.type === 'route_execution')
		expect(route).toMatchObject({
			request_path: '/ssr/[REDACTED]?api_key=%5BREDACTED%5D&chain=ethereum',
			attributes: {
				params: { id: '[REDACTED]', token: '[REDACTED]' },
				query: { api_key: '[REDACTED]', chain: 'ethereum' }
			}
		})
		expect(JSON.stringify(route)).not.toContain('ssr-secret')
		expect(JSON.stringify(route)).not.toContain('abcdefghijklmnopqrstuvwxyz123456')
	})

	it('records API route JSON, send, write/end byte counts, status, and errors', async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		await withApiRouteTelemetry('/api/json', async (_req, res) => {
			res.status(201).json({ ok: true })
		})(apiRequest('POST', '/api/json?x=1'), createMockNextApiResponse())

		await withApiRouteTelemetry('/api/send', async (_req, res) => {
			res.send('hello')
		})(apiRequest('GET', '/api/send'), createMockNextApiResponse())

		await withApiRouteTelemetry('/api/stream', async (_req, res) => {
			res.write('ab')
			res.end(Buffer.from('cd'))
		})(apiRequest('GET', '/api/stream'), createMockNextApiResponse())

		await expect(
			withApiRouteTelemetry('/api/error', async () => {
				throw new Error('api failed')
			})(apiRequest('GET', '/api/error'), createMockNextApiResponse())
		).rejects.toThrow('api failed')

		const events = sentEvents(fetchMock)
		expect(events.find((event) => event.type === 'route_execution' && event.route === '/api/json')).toMatchObject({
			method: 'POST',
			request_path: '/api/json?x=1',
			http_status: 201,
			attributes: { query: { x: '1' }, response_bytes: 11 }
		})
		expect(events.find((event) => event.type === 'route_execution' && event.route === '/api/send')).toMatchObject({
			attributes: { response_bytes: 5 }
		})
		expect(events.find((event) => event.type === 'route_execution' && event.route === '/api/stream')).toMatchObject({
			attributes: { response_bytes: 4 }
		})
		expect(events.find((event) => event.type === 'route_execution' && event.route === '/api/error')).toMatchObject({
			status: 'error',
			error_message: 'api failed'
		})
	})

	it('sanitizes API request paths and query attributes', async () => {
		vi.stubEnv('API_KEY', 'route-secret')
		const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		await withApiRouteTelemetry('/api/redact', async (_req, res) => {
			res.end()
		})(
			apiRequest('GET', '/api/redact/abcdefghijklmnopqrstuvwxyz123456?api_key=route-secret&chain=ethereum'),
			createMockNextApiResponse()
		)

		const route = sentEvents(fetchMock).find((event) => event.type === 'route_execution')
		expect(route).toMatchObject({
			request_path: '/api/redact/[REDACTED]?api_key=%5BREDACTED%5D&chain=ethereum',
			attributes: { query: { api_key: '[REDACTED]', chain: 'ethereum' } }
		})
		expect(JSON.stringify(route)).not.toContain('route-secret')
	})

	it('records domain events on the active route trace', async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		await withStaticRouteTelemetry('/token-rights', async () => {
			recordDomainEvent('token_rights.alert', 'warn', 'token-rights', 'Skipped token rights entries', {
				skipped_count: 1
			})
			return { props: {} }
		})

		const events = sentEvents(fetchMock)
		const route = events.find((event) => event.type === 'route_execution')
		const domainEvent = events.find((event) => event.type === 'domain_event')
		expect(domainEvent).toMatchObject({
			trace_id: route?.trace_id,
			parent_span_id: route?.span_id,
			route: '/token-rights',
			event_name: 'token_rights.alert',
			level: 'warn',
			subject: 'token-rights',
			message: 'Skipped token rights entries',
			attributes: { skipped_count: 1 }
		})
	})

	it('links outbound fetch events to the active route span', async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url === 'https://api.llama.fi/test') {
				return new Response('{"ok":true}', {
					status: 200,
					headers: { 'content-length': '11' }
				})
			}

			return new Response(null, { status: 204 })
		})
		vi.stubGlobal('fetch', fetchMock)

		await withRouteTelemetry(
			{
				route: 'test-route',
				operationType: 'apiRoute',
				runtime: 'node',
				flushTimeoutMs: 1000
			},
			async () => {
				await fetchWithPoolingOnServer('https://api.llama.fi/test', { timeout: 1234 })
				return 'ok'
			}
		)

		const batch = sentBatch(fetchMock)
		const route = batch.events.find((event: TelemetryEvent) => event.type === 'route_execution')
		const outbound = batch.events.find((event: TelemetryEvent) => event.type === 'outbound_http_request')

		expect(route).toMatchObject({
			type: 'route_execution',
			route: 'test-route',
			status: 'success',
			attributes: { outbound_count: 1 }
		})
		expect(outbound).toMatchObject({
			type: 'outbound_http_request',
			trace_id: route.trace_id,
			parent_span_id: route.span_id,
			host: 'api.llama.fi',
			pathname: '/test',
			http_status: 200,
			timeout_ms: 1234,
			attributes: { api_group: 'api.llama.fi/test', response_bytes: 11 }
		})
		expect(outbound).not.toHaveProperty('apiGroup')
	})

	it('resolves relative server fetch URLs before pooling and telemetry', async () => {
		vi.stubEnv('SITE_URL', 'https://defillama.test')
		const fetchMock = vi.fn(async (url: string) => {
			if (url === 'https://defillama.test/api/test?x=1') return new Response('{}', { status: 200 })
			return new Response(null, { status: 204 })
		})
		vi.stubGlobal('fetch', fetchMock)

		await withRouteTelemetry(
			{
				route: 'relative-route',
				operationType: 'apiRoute',
				runtime: 'node',
				flushTimeoutMs: 1000
			},
			async () => {
				await fetchWithPoolingOnServer('/api/test?x=1')
				return 'ok'
			}
		)

		const outbound = sentEvents(fetchMock).find((event) => event.type === 'outbound_http_request')
		expect(fetchMock.mock.calls.some(([url]) => url === 'https://defillama.test/api/test?x=1')).toBe(true)
		expect(outbound).toMatchObject({
			url: 'https://defillama.test/api/test?x=1',
			host: 'defillama.test',
			pathname: '/api/test'
		})
	})

	it('propagates caller abort signals through server fetch timeouts', async () => {
		const controller = new AbortController()
		const fetchState: { signal?: AbortSignal } = {}
		const fetchMock = vi.fn(
			async (_url: string, init: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					fetchState.signal = init.signal ?? undefined
					fetchState.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
				})
		)
		vi.stubGlobal('fetch', fetchMock)

		const request = fetchWithPoolingOnServer('https://api.llama.fi/abort', {
			signal: controller.signal,
			timeout: 60_000
		})
		await Promise.resolve()
		const signal = fetchState.signal
		if (!signal) throw new Error('missing fetch signal')
		expect(signal.aborted).toBe(false)

		controller.abort()

		await expect(request).rejects.toThrow('Aborted')
		expect(signal.aborted).toBe(true)
	})

	it('passes an already-aborted caller signal to fetch as aborted', async () => {
		const controller = new AbortController()
		controller.abort()
		const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
			expect(init.signal?.aborted).toBe(true)
			throw new DOMException('Aborted', 'AbortError')
		})
		vi.stubGlobal('fetch', fetchMock)

		await expect(
			fetchWithPoolingOnServer('https://api.llama.fi/already-aborted', {
				signal: controller.signal,
				timeout: 60_000
			})
		).rejects.toThrow('Aborted')
	})

	it('records sanitized POST bodies for own server requests', async () => {
		vi.stubEnv('API_KEY', 'llama-secret')
		vi.stubEnv('CG_KEY', 'coingecko-secret')
		const fetchMock = vi.fn(async (url: string) => {
			if (url.startsWith('https://api.llama.fi/')) return new Response('{}', { status: 200 })
			return new Response(null, { status: 204 })
		})
		vi.stubGlobal('fetch', fetchMock)

		await withRouteTelemetry(
			{
				route: 'post-route',
				operationType: 'apiRoute',
				runtime: 'node',
				flushTimeoutMs: 1000
			},
			async () => {
				await fetchWithPoolingOnServer(
					'https://api.llama.fi/test?api_key=llama-secret&cg_key=coingecko-secret&chain=ethereum',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							chain: 'ethereum',
							apiKey: 'llama-secret',
							nested: { token: 'coingecko-secret', value: 'ok' }
						})
					}
				)
				return 'ok'
			}
		)

		const outbound = sentEvents(fetchMock).find((event) => event.type === 'outbound_http_request')
		expect(outbound).toMatchObject({
			url: 'https://api.llama.fi/test?api_key=%5BREDACTED%5D&cg_key=%5BREDACTED%5D&chain=ethereum',
			attributes: {
				request_bytes: 95,
				request_body: {
					chain: 'ethereum',
					apiKey: '[REDACTED]',
					nested: { token: '[REDACTED]', value: 'ok' }
				}
			}
		})
		expect(JSON.stringify(outbound)).not.toContain('llama-secret')
		expect(JSON.stringify(outbound)).not.toContain('coingecko-secret')
	})

	it('records request attributes when an own server POST fails before a response', async () => {
		vi.stubEnv('API_KEY', 'failed-secret')
		const fetchMock = vi.fn(async (url: string) => {
			if (url === process.env.OPS_TELEMETRY_URL) return new Response(null, { status: 204 })
			throw new TypeError('network down')
		})
		vi.stubGlobal('fetch', fetchMock)

		await expect(
			withRouteTelemetry(
				{
					route: 'post-failure-route',
					operationType: 'apiRoute',
					runtime: 'node',
					flushTimeoutMs: 1000
				},
				async () => {
					await fetchWithPoolingOnServer('https://api.llama.fi/fail?api_key=failed-secret', {
						method: 'POST',
						body: JSON.stringify({ apiKey: 'failed-secret', chain: 'ethereum' })
					})
				}
			)
		).rejects.toThrow('network down')

		const outbound = sentEvents(fetchMock).find((event) => event.type === 'outbound_http_request')
		expect(outbound).toMatchObject({
			status: 'network_error',
			url: 'https://api.llama.fi/fail?api_key=%5BREDACTED%5D',
			attributes: {
				api_group: 'api.llama.fi/fail',
				request_bytes: 45,
				request_body: { apiKey: '[REDACTED]', chain: 'ethereum' }
			}
		})
		expect(outbound).not.toHaveProperty('apiGroup')
		const outboundRuntimeError = sentEvents(fetchMock).find((event) => event.type === 'runtime_error')
		expect(outboundRuntimeError).toMatchObject({
			phase: 'outboundFetch',
			parent_span_id: outbound?.span_id
		})
		expect(JSON.stringify(outbound)).not.toContain('failed-secret')
	})

	it('redacts JSON body keys before truncating large request bodies', async () => {
		vi.stubEnv('OPS_TELEMETRY_REQUEST_BODY_MAX_BYTES', '80')
		const fetchMock = vi.fn(async (url: string) => {
			if (url.startsWith('https://api.llama.fi/')) return new Response('{}', { status: 200 })
			return new Response(null, { status: 204 })
		})
		vi.stubGlobal('fetch', fetchMock)

		await withRouteTelemetry(
			{
				route: 'large-post-route',
				operationType: 'apiRoute',
				runtime: 'node',
				flushTimeoutMs: 1000
			},
			async () => {
				await fetchWithPoolingOnServer('https://api.llama.fi/large', {
					method: 'POST',
					body: JSON.stringify({
						apiKey: 'not-in-env-secret',
						nested: { token: 'also-not-in-env-secret' },
						filler: 'x'.repeat(200)
					})
				})
				return 'ok'
			}
		)

		const outbound = sentEvents(fetchMock).find((event) => event.type === 'outbound_http_request')
		expect(outbound).toMatchObject({
			attributes: {
				request_body_truncated: true
			}
		})
		expect(JSON.stringify(outbound)).toContain('[REDACTED]')
		expect(JSON.stringify(outbound)).not.toContain('not-in-env-secret')
		expect(JSON.stringify(outbound)).not.toContain('also-not-in-env-secret')
	})

	it('links outbound spans from static, SSR, and API route contexts', async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url.startsWith('https://api.llama.fi/')) return new Response('{}', { status: 200 })
			return new Response(null, { status: 204 })
		})
		vi.stubGlobal('fetch', fetchMock)

		await withStaticRouteTelemetry('/static-link', async () => {
			await fetchWithPoolingOnServer('https://api.llama.fi/static-link')
			return { props: {} }
		})
		await withServerSidePropsTelemetry('/ssr-link', async () => {
			await fetchWithPoolingOnServer('https://api.llama.fi/ssr-link')
			return { props: {} }
		})(ssrContext('/ssr-link'))
		await withApiRouteTelemetry('/api/link', async (_req, res) => {
			await fetchWithPoolingOnServer('https://api.llama.fi/api-link')
			res.end()
		})(apiRequest('GET', '/api/link'), createMockNextApiResponse())

		const events = sentEvents(fetchMock)
		for (const routeName of ['/static-link', '/ssr-link', '/api/link']) {
			const route = events.find((event) => event.type === 'route_execution' && event.route === routeName)
			const outbound = events.find(
				(event) => event.type === 'outbound_http_request' && event.parent_span_id === route?.span_id
			)
			expect(outbound).toMatchObject({
				trace_id: route?.trace_id,
				parent_span_id: route?.span_id
			})
		}
	})

	it('records retry attempt metadata for each outbound fetch attempt', async () => {
		let upstreamCalls = 0
		const fetchMock = vi.fn(async (url: string) => {
			if (url === 'https://api.llama.fi/retry') {
				upstreamCalls++
				if (upstreamCalls === 1) return new Response('retry', { status: 500 })
				return new Response('{"ok":true}', { status: 200 })
			}

			return new Response(null, { status: 204 })
		})
		vi.stubGlobal('fetch', fetchMock)

		await withStaticRouteTelemetry('/retry-page', async () => {
			await fetchJson('https://api.llama.fi/retry')
			return { props: {} }
		})

		const outbound = sentEvents(fetchMock).filter((event) => event.type === 'outbound_http_request')
		expect(outbound).toHaveLength(2)
		expect(outbound.map((event) => event.attempt)).toEqual([1, 2])
		expect(outbound.map((event) => event.max_attempts)).toEqual([2, 2])
		expect(outbound.map((event) => event.status)).toEqual(['http_error', 'success'])
	})
})
