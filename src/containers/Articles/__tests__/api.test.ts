import { describe, expect, it, vi } from 'vitest'
import { ArticleApiError, listArticles } from '../api'

const createFetchMock = (response: Response) => vi.fn(async (_url: string, _options?: RequestInit) => response)

describe('articles api client', () => {
	it('builds discovery query parameters', async () => {
		const fetchFn = createFetchMock(
			new Response(JSON.stringify({ items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 1 }))
		)

		await listArticles({ query: 'stablecoins', tags: ['lending'], sort: 'newest' }, fetchFn)

		const url = new URL(fetchFn.mock.calls[0][0])
		expect(url.pathname).toBe('/articles')
		expect(url.searchParams.get('query')).toBe('stablecoins')
		expect(url.searchParams.get('tags')).toBe('lending')
		expect(url.searchParams.get('sort')).toBe('newest')
	})

	it('surfaces server errors', async () => {
		const fetchFn = createFetchMock(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))

		await expect(listArticles({}, fetchFn)).rejects.toMatchObject({
			name: 'ArticleApiError',
			message: 'Unauthorized',
			status: 401
		})
		await expect(listArticles({}, fetchFn)).rejects.toBeInstanceOf(ArticleApiError)
	})
})
