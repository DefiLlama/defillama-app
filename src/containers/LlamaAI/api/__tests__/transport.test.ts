import { describe, expect, it } from 'vitest'
import { AI_SERVER } from '~/constants'
import { llamaAIRequest, LlamaAITransportError, type AuthorizedFetch } from '~/containers/LlamaAI/api/transport'

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers
		}
	})
}

describe('llamaAIRequest', () => {
	it('prefixes relative paths and sends json bodies', async () => {
		let requestUrl = ''
		let requestInit: RequestInit | undefined
		const fetcher: AuthorizedFetch = async (url, init) => {
			requestUrl = url
			requestInit = init
			return jsonResponse({ ok: true })
		}

		const result = await llamaAIRequest<{ ok: true }>(fetcher, '/example', {
			method: 'POST',
			json: { value: 1 }
		})

		expect(result).toEqual({ ok: true })
		expect(requestUrl).toBe(`${AI_SERVER}/example`)
		expect(requestInit?.method).toBe('POST')
		expect(requestInit?.body).toBe(JSON.stringify({ value: 1 }))
		expect(requestInit?.headers).toEqual({ 'content-type': 'application/json' })
		expect(new Headers(requestInit?.headers).get('Content-Type')).toBe('application/json')
	})

	it('throws a transport error for null auth responses and backend errors', async () => {
		await expect(llamaAIRequest(async () => null, '/example')).rejects.toMatchObject({
			name: 'LlamaAITransportError',
			status: 401,
			body: { error: 'unauthenticated' }
		})

		const fetcher: AuthorizedFetch = async () => jsonResponse({ error: 'Nope' }, { status: 403 })
		await expect(llamaAIRequest(fetcher, '/example')).rejects.toBeInstanceOf(LlamaAITransportError)
		await expect(llamaAIRequest(fetcher, '/example')).rejects.toMatchObject({
			message: 'Nope',
			status: 403,
			body: { error: 'Nope' }
		})
	})

	it('returns null for empty responses and rejects unexpected content types', async () => {
		const emptyFetcher: AuthorizedFetch = async () => new Response(null, { status: 204 })
		await expect(llamaAIRequest(emptyFetcher, '/empty')).resolves.toBeNull()

		const emptyOkFetcher: AuthorizedFetch = async () => new Response('', { status: 200 })
		await expect(llamaAIRequest(emptyOkFetcher, '/empty-ok')).resolves.toBeNull()

		const htmlFetcher: AuthorizedFetch = async () =>
			new Response('<html></html>', {
				status: 200,
				headers: { 'Content-Type': 'text/html' }
			})
		await expect(llamaAIRequest(htmlFetcher, '/html')).rejects.toThrow('Unexpected LlamaAI response content type')
	})

	it('wraps invalid JSON responses with transport context', async () => {
		const fetcher: AuthorizedFetch = async () =>
			new Response('{bad json', {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})

		await expect(llamaAIRequest(fetcher, '/invalid-json')).rejects.toMatchObject({
			name: 'LlamaAITransportError',
			status: 200,
			body: expect.objectContaining({
				error: 'invalid_json',
				body: '{bad json'
			})
		})
	})
})
