import { describe, expect, it, vi } from 'vitest'
import { runPostStartHook } from '../postStartHook'
import { testEnv } from './testEnv'

describe('post-start hook', () => {
	it('skips Cloudflare purge when env is missing', async () => {
		const fetchImpl = vi.fn()

		const result = await runPostStartHook({
			env: testEnv(),
			fetchImpl,
			logger: { log: vi.fn() }
		})

		expect(result).toEqual({ reason: 'missing Cloudflare env', status: 'skipped' })
		expect(fetchImpl).not.toHaveBeenCalled()
	})

	it('retries health before purging Cloudflare cache', async () => {
		let now = 0
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }))

		const result = await runPostStartHook({
			env: testEnv({
				CF_PURGE_CACHE_AUTH: 'token',
				CF_ZONE: 'zone',
				PORT: '3000',
				POST_START_HEALTH_INTERVAL_MS: '1',
				POST_START_HEALTH_TIMEOUT_MS: '5000'
			}),
			fetchImpl,
			logger: { log: vi.fn() },
			now: () => {
				now += 1
				return now
			},
			sleep: vi.fn().mockResolvedValue(undefined)
		})

		expect(result).toEqual({ attempts: 2, status: 'purged' })
		expect(fetchImpl).toHaveBeenCalledTimes(3)
	})
})
