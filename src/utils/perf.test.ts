import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/utils/cache-client', () => ({
	getCache: vi.fn(),
	setCache: vi.fn(),
	setPageBuildTimes: vi.fn()
}))

async function loadPerformanceLogging({ timeoutMs, maxRetries = 3 }: { timeoutMs?: number; maxRetries?: number }) {
	vi.resetModules()
	vi.stubEnv('PAGE_BUILD_TIMEOUT_MS', timeoutMs === undefined ? 'default' : String(timeoutMs))
	vi.stubEnv('PAGE_BUILD_MAX_RETRIES', String(maxRetries))
	vi.stubEnv('RUNTIME_LOG_SILENT', '1')

	return import('./perf')
}

describe('withPerformanceLogging', () => {
	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
	})

	it('fails page builds that exceed the page timeout', async () => {
		vi.useFakeTimers()
		const { withPerformanceLogging } = await loadPerformanceLogging({ timeoutMs: 1_000 })
		let calls = 0

		const getStaticProps = withPerformanceLogging('slow-page', async () => {
			calls++
			await new Promise((resolve) => setTimeout(resolve, 2_000))
			return { props: { ok: true } }
		})
		const result = expect(getStaticProps({} as never)).rejects.toThrow('slow-page: page build timed out after 1000ms')

		await vi.advanceTimersByTimeAsync(1_000)

		await result
		expect(calls).toBe(1)
	})

	it('allows slow page builds within the default timeout', async () => {
		vi.useFakeTimers()
		const { withPerformanceLogging } = await loadPerformanceLogging({})

		const getStaticProps = withPerformanceLogging('slow-valid-page', async () => {
			await new Promise((resolve) => setTimeout(resolve, 16_000))
			return { props: { ok: true } }
		})
		const result = expect(getStaticProps({} as never)).resolves.toEqual({ props: { ok: true } })

		await vi.advanceTimersByTimeAsync(16_000)

		await result
	})

	it('aborts fetches started by timed out page builds', async () => {
		vi.useFakeTimers()
		let signal: AbortSignal | undefined

		vi.stubGlobal(
			'fetch',
			vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
				signal = init?.signal ?? undefined
				return new Promise<Response>(() => {})
			})
		)

		const { withPerformanceLogging } = await loadPerformanceLogging({ timeoutMs: 1_000 })
		const { fetchJson } = await import('./async')

		const getStaticProps = withPerformanceLogging('slow-fetch-page', async () => {
			await fetchJson('https://example.com/slow')
			return { props: { ok: true } }
		})
		const result = expect(getStaticProps({} as never)).rejects.toThrow(
			'slow-fetch-page: page build timed out after 1000ms'
		)

		await vi.advanceTimersByTimeAsync(1_000)

		await result
		expect(signal?.aborted).toBe(true)
	})

	it('still retries non-timeout transient page build errors', async () => {
		const { withPerformanceLogging } = await loadPerformanceLogging({ timeoutMs: 1_000, maxRetries: 2 })
		let calls = 0

		const getStaticProps = withPerformanceLogging('retry-page', async () => {
			calls++
			if (calls === 1) throw new Error('socket hang up')
			return { props: { ok: true } }
		})

		await expect(getStaticProps({} as never)).resolves.toEqual({ props: { ok: true } })
		expect(calls).toBe(2)
	})

	it('does not classify timeout text in another error as a page build timeout', async () => {
		const { withPerformanceLogging } = await loadPerformanceLogging({ timeoutMs: 1_000, maxRetries: 2 })
		let calls = 0

		const getStaticProps = withPerformanceLogging('retry-page', async () => {
			calls++
			if (calls === 1) throw new Error('upstream page build timed out after gateway timeout')
			return { props: { ok: true } }
		})

		await expect(getStaticProps({} as never)).resolves.toEqual({ props: { ok: true } })
		expect(calls).toBe(2)
	})
})
