import type { NextApiRequest } from 'next'
import { describe, expect, it, vi } from 'vitest'
import { revalidateInstancesHandler } from '~/pages/api/private/revalidate-instances'
import {
	assertRevalidateFanoutSucceeded,
	fanoutRevalidate,
	normalizeCachePaths,
	revalidateInstancesFromEnv
} from '~/server/revalidateInstances'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const baseEnv = {
	...process.env,
	REVALIDATE_INSTANCES: 'https://a.internal,https://b.internal/',
	REVALIDATE_SECRET: 'shhh'
}

function request(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
	return {
		body: { paths: ['/research'] },
		headers: { 'x-revalidate-secret': 'shhh' },
		method: 'POST',
		query: {},
		...overrides
	} as NextApiRequest
}

describe('revalidate instance helpers', () => {
	it('normalizes any root-relative path and rejects absolute/protocol-relative urls', () => {
		expect(
			normalizeCachePaths([
				'/research',
				'/protocol/aave?tab=tvl',
				'/pro/123#section',
				'relative/path',
				'//evil.example',
				'https://evil.example/x',
				42
			])
		).toEqual(['/research', '/protocol/aave', '/pro/123'])
	})

	it('parses, trims, and dedupes the instance list', () => {
		expect(
			revalidateInstancesFromEnv({
				...process.env,
				REVALIDATE_INSTANCES: ' https://a.internal/ , https://a.internal, ,https://b.internal '
			})
		).toEqual(['https://a.internal', 'https://b.internal'])
	})

	it('is disabled without a secret', async () => {
		const fetchImpl = vi.fn()
		const result = await fanoutRevalidate(['/research'], {
			env: { ...process.env, REVALIDATE_INSTANCES: 'https://a.internal' },
			fetchImpl,
			logger: { log: vi.fn() }
		})
		expect(result).toEqual({ instances: [], status: 'disabled' })
		expect(fetchImpl).not.toHaveBeenCalled()
	})

	it('is disabled without configured instances', async () => {
		const fetchImpl = vi.fn()
		const result = await fanoutRevalidate(['/research'], {
			env: { ...process.env, REVALIDATE_SECRET: 'shhh' },
			fetchImpl,
			logger: { log: vi.fn() }
		})
		expect(result).toEqual({ instances: [], status: 'disabled' })
		expect(fetchImpl).not.toHaveBeenCalled()
	})

	it('posts the secret header and paths to every instance worker endpoint', async () => {
		const fetchImpl = vi
			.fn()
			.mockImplementation(
				async () => new Response(JSON.stringify({ revalidated: ['/research'], revalidateErrors: [] }), { status: 200 })
			)

		const result = await fanoutRevalidate(['/research', '/research/report/story'], {
			env: baseEnv,
			fetchImpl,
			logger: { log: vi.fn() }
		})

		expect(result.status).toBe('fanned-out')
		expect(result.instances).toEqual([
			{ instance: 'https://a.internal', revalidateErrors: [], revalidated: ['/research'], status: 'revalidated' },
			{ instance: 'https://b.internal', revalidateErrors: [], revalidated: ['/research'], status: 'revalidated' }
		])

		expect(fetchImpl).toHaveBeenCalledTimes(2)
		const [url, init] = fetchImpl.mock.calls[0]
		expect(url).toBe('https://a.internal/api/private/revalidate-instances')
		expect(init.method).toBe('POST')
		expect(init.headers['x-revalidate-secret']).toBe('shhh')
		expect(JSON.parse(init.body)).toEqual({ paths: ['/research', '/research/report/story'] })
		expect(fetchImpl.mock.calls[1][0]).toBe('https://b.internal/api/private/revalidate-instances')
	})

	it('marks a failing instance as failed without rejecting the others', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response('boom', { status: 500, statusText: 'Internal Server Error' }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ revalidated: ['/research'], revalidateErrors: [] }), { status: 200 })
			)

		const result = await fanoutRevalidate(['/research'], {
			env: baseEnv,
			fetchImpl,
			logger: { log: vi.fn() }
		})

		expect(result.instances[0]).toEqual({ instance: 'https://a.internal', reason: 'boom', status: 'failed' })
		expect(result.instances[1]).toEqual({
			instance: 'https://b.internal',
			revalidateErrors: [],
			revalidated: ['/research'],
			status: 'revalidated'
		})
		expect(() => assertRevalidateFanoutSucceeded(result, ['/research'], { requireConfigured: true })).toThrow(
			'Cross-instance revalidation failed'
		)
	})

	it('marks a thrown/aborted instance as failed', async () => {
		const fetchImpl = vi
			.fn()
			.mockRejectedValueOnce(new Error('aborted'))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ revalidated: ['/research'], revalidateErrors: [] }), { status: 200 })
			)

		const result = await fanoutRevalidate(['/research'], {
			env: baseEnv,
			fetchImpl,
			logger: { log: vi.fn() }
		})

		expect(result.instances[0]).toEqual({ instance: 'https://a.internal', reason: 'aborted', status: 'failed' })
		expect(result.instances[1].status).toBe('revalidated')
	})

	it('requires configuration when strict fanout is enabled', () => {
		expect(() =>
			assertRevalidateFanoutSucceeded({ instances: [], status: 'disabled' }, ['/research'], { requireConfigured: true })
		).toThrow('Cross-instance revalidation is not configured')
		expect(() =>
			assertRevalidateFanoutSucceeded({ instances: [], status: 'disabled' }, [], { requireConfigured: true })
		).not.toThrow()
	})
})

describe('/api/private/revalidate-instances', () => {
	it('returns 500 when any path revalidation fails', async () => {
		vi.stubEnv('REVALIDATE_SECRET', 'shhh')
		const res = createMockNextApiResponse()
		res.revalidate.mockRejectedValueOnce(new Error('missing page'))

		await revalidateInstancesHandler(request(), res)

		expect(res.revalidate).toHaveBeenCalledWith('/research')
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith({
			revalidateErrors: [{ path: '/research', reason: 'missing page' }],
			revalidated: []
		})
		vi.unstubAllEnvs()
	})
})
