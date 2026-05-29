import type { NextApiRequest } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ArticleDocument } from '~/containers/Articles/types'
import { researchUnpublishHandler } from '~/pages/api/private/research/articles/[id]/unpublish'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

function request(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
	return {
		body: {},
		headers: {},
		method: 'POST',
		query: { id: 'article-id' },
		...overrides
	} as NextApiRequest
}

function article(overrides: Partial<ArticleDocument> = {}): ArticleDocument {
	return {
		id: 'article-id',
		section: 'report',
		slug: 'old-story',
		status: 'published',
		...overrides
	} as ArticleDocument
}

describe('/api/private/research/articles/[id]/unpublish', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it('unpublishes through the backend, revalidates ISR indexes, and purges public research urls', async () => {
		vi.stubEnv('CF_ZONE', 'zone')
		vi.stubEnv('CF_PURGE_CACHE_AUTH', 'token')
		vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://defillama.test')

		const before = article({ section: 'report', slug: 'old-story' })
		const after = article({ section: 'report', slug: 'old-story', status: 'draft' })
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ article: before }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ article: after }), { status: 200 }))
			.mockResolvedValueOnce(new Response('{}', { status: 200 }))
		vi.stubGlobal('fetch', fetchImpl)
		const res = createMockNextApiResponse()

		await researchUnpublishHandler(request({ headers: { authorization: 'Bearer user-token' } }), res)

		expect(new URL(fetchImpl.mock.calls[0][0]).pathname).toBe('/articles/article-id/edit')
		expect(fetchImpl.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer user-token' } })
		expect(new URL(fetchImpl.mock.calls[1][0]).pathname).toBe('/articles/article-id/unpublish')
		expect(fetchImpl.mock.calls[1][1]).toEqual({
			headers: { Authorization: 'Bearer user-token' },
			method: 'POST'
		})
		expect(res.revalidate).toHaveBeenCalledWith('/research')
		expect(res.revalidate).toHaveBeenCalledWith('/research/report')
		expect(res.revalidate).not.toHaveBeenCalledWith('/research/report/old-story')
		expect(fetchImpl).toHaveBeenLastCalledWith('https://api.cloudflare.com/client/v4/zones/zone/purge_cache', {
			body: JSON.stringify({
				files: [
					'https://defillama.test/research',
					'https://defillama.test/research/report/old-story',
					'https://defillama.test/research/report'
				]
			}),
			headers: {
				Authorization: 'Bearer token',
				'Content-Type': 'application/json'
			},
			method: 'POST'
		})
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			article: after,
			cache: {
				cloudflare: {
					status: 'purged',
					urls: [
						'https://defillama.test/research',
						'https://defillama.test/research/report/old-story',
						'https://defillama.test/research/report'
					]
				},
				instances: [],
				revalidateErrors: [],
				revalidated: ['/research', '/research/report']
			}
		})
	})
})
