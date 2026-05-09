import { describe, expect, it, vi } from 'vitest'
import { ArticleApiError, listArticles, transferOwnership, updateCollaborator } from '../api'

const createFetchMock = (makeResponse: () => Response) =>
	vi.fn(async (_url: string, _options?: RequestInit) => makeResponse())

describe('articles api client', () => {
	it('builds discovery query parameters', async () => {
		const fetchFn = createFetchMock(
			() => new Response(JSON.stringify({ items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 1 }))
		)

		await listArticles({ query: 'stablecoins', tags: ['lending'], sort: 'newest' }, fetchFn)

		const url = new URL(fetchFn.mock.calls[0][0])
		expect(url.pathname).toBe('/articles')
		expect(url.searchParams.get('query')).toBe('stablecoins')
		expect(url.searchParams.get('tags')).toBe('lending')
		expect(url.searchParams.get('sort')).toBe('newest')
	})

	it('surfaces server errors', async () => {
		const fetchFn = createFetchMock(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))

		await expect(listArticles({}, fetchFn)).rejects.toMatchObject({
			name: 'ArticleApiError',
			message: 'Unauthorized',
			status: 401
		})
		await expect(listArticles({}, fetchFn)).rejects.toBeInstanceOf(ArticleApiError)
	})

	it('updates collaborator visibility with a PATCH payload', async () => {
		const fetchFn = createFetchMock(
			() =>
				new Response(
					JSON.stringify({
						collaborator: {
							pbUserId: 'pb/user 1',
							role: 'collaborator',
							hidden: true,
							profile: { displayName: 'Alice' }
						}
					})
				)
		)

		const collaborator = await updateCollaborator('article/1', 'pb/user 1', { hidden: true }, fetchFn)

		const [url, options] = fetchFn.mock.calls[0]
		expect(new URL(url).pathname).toBe('/articles/article%2F1/collaborators/pb%2Fuser%201')
		expect(options).toMatchObject({
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ hidden: true })
		})
		expect(collaborator.hidden).toBe(true)
	})

	it('transfers article ownership by target user id', async () => {
		const fetchFn = createFetchMock(
			() =>
				new Response(
					JSON.stringify({
						article: {
							id: 'article-1',
							title: 'Stablecoin flows',
							viewerRole: 'collaborator'
						}
					})
				)
		)

		const article = await transferOwnership('article-1', { pbUserId: 'target-user' }, fetchFn)

		const [url, options] = fetchFn.mock.calls[0]
		expect(new URL(url).pathname).toBe('/articles/article-1/transfer-owner')
		expect(options).toMatchObject({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pbUserId: 'target-user' })
		})
		expect(article.viewerRole).toBe('collaborator')
	})
})
