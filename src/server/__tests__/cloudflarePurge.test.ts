import { describe, expect, it, vi } from 'vitest'
import {
	dashboardPathsToUrls,
	normalizeResearchCachePaths,
	purgeCloudflareResearchUrls,
	researchPathsToUrls
} from '~/server/cloudflarePurge'

describe('research Cloudflare purge helpers', () => {
	it('normalizes only research paths', () => {
		expect(
			normalizeResearchCachePaths([
				'/research',
				'/research/report/story?utm=1',
				'/protocol/aave',
				'https://evil.example/research',
				'/research/report/story#section'
			])
		).toEqual(['/research', '/research/report/story'])
	})

	it('purges Cloudflare by exact public urls', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))

		const result = await purgeCloudflareResearchUrls(['/research', '/research/report/story'], {
			env: {
				...process.env,
				CF_PURGE_CACHE_AUTH: 'token',
				CF_ZONE: 'zone',
				NEXT_PUBLIC_SITE_URL: 'https://defillama.test'
			},
			fetchImpl,
			logger: { log: vi.fn() }
		})

		expect(result).toEqual({
			status: 'purged',
			urls: ['https://defillama.test/research', 'https://defillama.test/research/report/story']
		})
		expect(fetchImpl).toHaveBeenCalledWith('https://api.cloudflare.com/client/v4/zones/zone/purge_cache', {
			body: JSON.stringify({
				files: ['https://defillama.test/research', 'https://defillama.test/research/report/story']
			}),
			headers: {
				Authorization: 'Bearer token',
				'Content-Type': 'application/json'
			},
			method: 'POST'
		})
	})

	it('uses the configured site url when building purge urls', () => {
		expect(
			researchPathsToUrls(['/research/report/story'], { ...process.env, SITE_URL: 'https://www.defillama.test' })
		).toEqual(['https://www.defillama.test/research/report/story'])
	})
})

describe('dashboard Cloudflare purge helpers', () => {
	const env = { ...process.env, NEXT_PUBLIC_SITE_URL: 'https://defillama.test' }

	it('builds page and stream urls for id, slug, and previous slug', () => {
		expect(dashboardPathsToUrls({ id: 'dash-1', slug: 'yield-overview', previousSlug: 'old-yield' }, env)).toEqual([
			'https://defillama.test/pro/dash-1',
			'https://defillama.test/api/dynamic/dashboard/dash-1/stream',
			'https://defillama.test/pro/yield-overview',
			'https://defillama.test/api/dynamic/dashboard/yield-overview/stream',
			'https://defillama.test/pro/old-yield',
			'https://defillama.test/api/dynamic/dashboard/old-yield/stream'
		])
	})

	it('dedupes keys and skips empty slugs', () => {
		expect(dashboardPathsToUrls({ id: 'dash-1', slug: 'dash-1', previousSlug: null }, env)).toEqual([
			'https://defillama.test/pro/dash-1',
			'https://defillama.test/api/dynamic/dashboard/dash-1/stream'
		])
	})
})
