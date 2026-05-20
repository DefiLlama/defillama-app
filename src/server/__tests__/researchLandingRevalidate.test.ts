import type { NextApiRequest } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { researchLandingRevalidateHandler } from '~/pages/api/research/revalidate-landing'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

function request(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
	return {
		body: {},
		headers: {},
		method: 'GET',
		query: {},
		...overrides
	} as NextApiRequest
}

describe('/api/research/revalidate-landing', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it('requires an auth header', async () => {
		const fetchImpl = vi.fn()
		vi.stubGlobal('fetch', fetchImpl)
		const res = createMockNextApiResponse()

		await researchLandingRevalidateHandler(request(), res)

		expect(fetchImpl).not.toHaveBeenCalled()
		expect(res.revalidate).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(401)
		expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
	})

	it('validates the researcher session, then revalidates and purges /research', async () => {
		vi.stubEnv('CF_ZONE', 'zone')
		vi.stubEnv('CF_PURGE_CACHE_AUTH', 'token')
		vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://defillama.test')

		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))
			.mockResolvedValueOnce(new Response('{}', { status: 200 }))
		vi.stubGlobal('fetch', fetchImpl)
		const res = createMockNextApiResponse()

		await researchLandingRevalidateHandler(request({ headers: { authorization: 'Bearer user-token' } }), res)

		expect(new URL(fetchImpl.mock.calls[0][0]).pathname).toBe('/articles/mine')
		expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('limit')).toBe('1')
		expect(fetchImpl.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer user-token' } })
		expect(res.revalidate).toHaveBeenCalledWith('/research')
		expect(fetchImpl).toHaveBeenLastCalledWith('https://api.cloudflare.com/client/v4/zones/zone/purge_cache', {
			body: JSON.stringify({ files: ['https://defillama.test/research'] }),
			headers: {
				Authorization: 'Bearer token',
				'Content-Type': 'application/json'
			},
			method: 'POST'
		})
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith({
			cloudflare: { status: 'purged', urls: ['https://defillama.test/research'] },
			revalidateErrors: [],
			revalidated: ['/research']
		})
	})

	it('passes auth validation failures through without touching caches', async () => {
		const fetchImpl = vi.fn().mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 'Forbidden' }), {
				headers: { 'Content-Type': 'application/json' },
				status: 403
			})
		)
		vi.stubGlobal('fetch', fetchImpl)
		const res = createMockNextApiResponse()

		await researchLandingRevalidateHandler(request({ headers: { authorization: 'Bearer user-token' } }), res)

		expect(res.revalidate).not.toHaveBeenCalled()
		expect(fetchImpl).toHaveBeenCalledTimes(1)
		expect(res.status).toHaveBeenCalledWith(403)
		expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
	})
})
