import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	cacheJitterOffsetSeconds,
	jitterCacheControlHeader,
	jitterCacheSeconds,
	readCacheJitterMeta,
	attachCacheJitterMeta
} from '../maxAgeForNext'

describe('cache lifetime jitter', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('returns a deterministic centered offset', () => {
		vi.stubEnv('NEXT_BUILD_ID', 'build-a')

		const first = cacheJitterOffsetSeconds('protocol/uniswap', 1200)
		const second = cacheJitterOffsetSeconds('protocol/uniswap', 1200)

		expect(first).toBe(second)
		expect(first).toBeGreaterThanOrEqual(-600)
		expect(first).toBeLessThanOrEqual(600)
	})

	it('changes the deterministic offset across build ids', () => {
		vi.stubEnv('NEXT_BUILD_ID', 'build-a')
		const first = cacheJitterOffsetSeconds('protocol/uniswap', 1200)

		vi.stubEnv('NEXT_BUILD_ID', 'build-b')
		const second = cacheJitterOffsetSeconds('protocol/uniswap', 1200)

		expect(first).not.toBe(second)
	})

	it('can be disabled without changing the base cache lifetime', () => {
		vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '0')

		expect(jitterCacheSeconds(30, 'short-cache')).toEqual({ seconds: 30, offsetSeconds: 0 })
		expect(jitterCacheControlHeader('public, s-maxage=300, stale-while-revalidate=600', 'route')).toBe(
			'public, s-maxage=300, stale-while-revalidate=600'
		)
	})

	it('jitters s-maxage while preserving the rest of the Cache-Control header', () => {
		vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '1200')
		vi.stubEnv('NEXT_BUILD_ID', 'build-a')

		const header = jitterCacheControlHeader('public, max-age=60, s-maxage=300, stale-while-revalidate=300', 'markets')
		const match = header.match(/s-maxage=(\d+)/)

		expect(header).toContain('public, max-age=60')
		expect(header).toContain('stale-while-revalidate=300')
		expect(Number(match?.[1])).toBeGreaterThanOrEqual(60)
	})

	it('stores jitter metadata without making it enumerable', () => {
		const target = attachCacheJitterMeta({ revalidate: 123 }, { cache_jitter_seconds: -12 })

		expect(readCacheJitterMeta(target)).toEqual({ cache_jitter_seconds: -12 })
		expect(Object.keys(target)).toEqual(['revalidate'])
	})
})
