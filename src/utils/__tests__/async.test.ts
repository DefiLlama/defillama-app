import { afterEach, describe, expect, it, vi } from 'vitest'

const jsonResponse = (value: unknown) =>
	new Response(JSON.stringify(value), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	})

describe('fetchJson singleflight', () => {
	afterEach(() => {
		vi.useRealTimers()
		vi.resetModules()
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it('shares concurrent safe public GET JSON requests when enabled', async () => {
		vi.stubEnv('SERVER_FETCH_JSON_SINGLEFLIGHT', '1')
		vi.stubEnv('SERVER_FETCH_JSON_TIMEOUT_MS', '1000')
		const fetchMock = vi.fn(
			() => new Promise<Response>((resolve) => setTimeout(() => resolve(jsonResponse({ ok: true })), 10))
		)
		vi.stubGlobal('fetch', fetchMock)
		const { fetchJson } = await import('../async')

		const [first, second] = await Promise.all([
			fetchJson('https://api.llama.fi/test'),
			fetchJson('https://api.llama.fi/test')
		])

		expect(first).toEqual({ ok: true })
		expect(second).toEqual({ ok: true })
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('does not singleflight unsafe requests', async () => {
		vi.stubEnv('SERVER_FETCH_JSON_SINGLEFLIGHT', '1')
		const fetchMock = vi.fn(async () => jsonResponse({ ok: true }))
		vi.stubGlobal('fetch', fetchMock)
		const { fetchJson } = await import('../async')

		await Promise.all([
			fetchJson('https://api.llama.fi/test', { method: 'POST', body: '{}' }),
			fetchJson('https://api.llama.fi/test', { method: 'POST', body: '{}' }),
			fetchJson('https://api.llama.fi/test', { headers: { cookie: 'session=1' } }),
			fetchJson('https://api.llama.fi/test', { headers: { cookie: 'session=1' } })
		])

		expect(fetchMock).toHaveBeenCalledTimes(4)
	})

	it('bypasses sharing when the waiter cap is reached', async () => {
		vi.stubEnv('SERVER_FETCH_JSON_SINGLEFLIGHT', '1')
		vi.stubEnv('SERVER_FETCH_JSON_SINGLEFLIGHT_MAX_WAITERS', '0')
		const fetchMock = vi.fn(
			() => new Promise<Response>((resolve) => setTimeout(() => resolve(jsonResponse({ ok: true })), 10))
		)
		vi.stubGlobal('fetch', fetchMock)
		const { fetchJson } = await import('../async')

		await Promise.all([fetchJson('https://api.llama.fi/test'), fetchJson('https://api.llama.fi/test')])

		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('times out followers without cancelling the leader request', async () => {
		vi.stubEnv('SERVER_FETCH_JSON_SINGLEFLIGHT', '1')
		vi.stubEnv('SERVER_FETCH_JSON_SINGLEFLIGHT_WAIT_MS', '5')
		vi.stubEnv('SERVER_FETCH_JSON_TIMEOUT_MS', '1000')
		const fetchMock = vi.fn(
			() => new Promise<Response>((resolve) => setTimeout(() => resolve(jsonResponse({ ok: true })), 50))
		)
		vi.stubGlobal('fetch', fetchMock)
		const { fetchJson } = await import('../async')

		const leader = fetchJson('https://api.llama.fi/test')
		await expect(fetchJson('https://api.llama.fi/test')).rejects.toThrow('singleflight wait timeout')
		await expect(leader).resolves.toEqual({ ok: true })
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('lets followers wait for the caller timeout by default', async () => {
		vi.stubEnv('SERVER_FETCH_JSON_SINGLEFLIGHT', '1')
		const fetchMock = vi.fn(
			() => new Promise<Response>((resolve) => setTimeout(() => resolve(jsonResponse({ ok: true })), 30))
		)
		vi.stubGlobal('fetch', fetchMock)
		const { fetchJson } = await import('../async')

		const [first, second] = await Promise.all([
			fetchJson('https://api.llama.fi/slow-dataset', { timeout: 50 }),
			fetchJson('https://api.llama.fi/slow-dataset', { timeout: 50 })
		])

		expect(first).toEqual({ ok: true })
		expect(second).toEqual({ ok: true })
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('does not singleflight Request inputs', async () => {
		vi.stubEnv('SERVER_FETCH_JSON_SINGLEFLIGHT', '1')
		const fetchMock = vi.fn(async () => jsonResponse({ ok: true }))
		vi.stubGlobal('fetch', fetchMock)
		const { fetchJson } = await import('../async')

		await Promise.all([
			fetchJson(new Request('https://api.llama.fi/test')),
			fetchJson(new Request('https://api.llama.fi/test'))
		])

		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('keeps the 60s default timeout for browser fetchJson calls', async () => {
		vi.useFakeTimers()
		vi.stubGlobal('window', {})
		let firstSignal: AbortSignal | undefined
		const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
			if (fetchMock.mock.calls.length > 1) return Promise.resolve(jsonResponse({ ok: true }))

			firstSignal = init?.signal ?? undefined
			return new Promise<Response>((_resolve, reject) => {
				firstSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
			})
		})
		vi.stubGlobal('fetch', fetchMock)
		const { fetchJson } = await import('../async')

		const request = fetchJson('https://api.llama.fi/browser-timeout')
		await Promise.resolve()

		await vi.advanceTimersByTimeAsync(25_000)
		expect(firstSignal?.aborted).toBe(false)

		await vi.advanceTimersByTimeAsync(35_000)
		expect(firstSignal?.aborted).toBe(true)
		await vi.advanceTimersByTimeAsync(2_000)

		await expect(request).resolves.toEqual({ ok: true })
		expect(fetchMock).toHaveBeenCalledTimes(2)
		vi.useRealTimers()
	})

	it('reads the fast and slow JSON timeouts from env with defaults', async () => {
		const { getFastJsonTimeoutMs, getSlowJsonTimeoutMs } = await import('../async')

		expect(getFastJsonTimeoutMs()).toBe(10_000)
		expect(getSlowJsonTimeoutMs()).toBe(45_000)

		vi.stubEnv('SERVER_FETCH_JSON_FAST_TIMEOUT_MS', '3500')
		vi.stubEnv('SERVER_FETCH_JSON_SLOW_TIMEOUT_MS', '55000')
		expect(getFastJsonTimeoutMs()).toBe(3500)
		expect(getSlowJsonTimeoutMs()).toBe(55_000)
	})
})
