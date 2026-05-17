import { describe, expect, it, vi } from 'vitest'
import {
	ArticleApiError,
	getAllArticlesBanner,
	listArticlePaths,
	listArticles,
	listArticlesByTag,
	updateEditorialTagMetadata,
	updateReportHighlightSponsorLogo
} from '../api'
import { EDITORIAL_TAGS } from '../editorialTags'

const createFetchMock = (response: Response) => vi.fn(async (_url: string, _options?: RequestInit) => response.clone())

describe('articles api client', () => {
	it('builds discovery query parameters', async () => {
		const fetchFn = createFetchMock(
			new Response(JSON.stringify({ items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 1 }))
		)

		await listArticles({ query: 'stablecoins', tags: ['lending'], sort: 'newest', section: 'report' }, fetchFn)

		const url = new URL(fetchFn.mock.calls[0][0])
		expect(url.pathname).toBe('/articles')
		expect(url.searchParams.get('query')).toBe('stablecoins')
		expect(url.searchParams.get('tags')).toBe('lending')
		expect(url.searchParams.get('sort')).toBe('newest')
		expect(url.searchParams.get('section')).toBe('report')
	})

	it('requests articles by editorial tag path and limit', async () => {
		const fetchFn = createFetchMock(
			new Response(JSON.stringify({ items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 1 }))
		)

		await listArticlesByTag(EDITORIAL_TAGS['report-highlight'].slug, 1, fetchFn)

		const url = new URL(fetchFn.mock.calls[0][0])
		expect(url.pathname).toBe('/articles/by-tag/report-highlight')
		expect(url.searchParams.get('limit')).toBe('1')
	})

	it('requests public article path metadata', async () => {
		const fetchFn = createFetchMock(new Response(JSON.stringify({ items: [] })))

		await listArticlePaths(fetchFn)

		const url = new URL(fetchFn.mock.calls[0][0])
		expect(url.pathname).toBe('/articles/paths')
	})

	it('patches editorial tag metadata', async () => {
		const fetchFn = createFetchMock(
			new Response(
				JSON.stringify({ articleId: 'article-id', tag: 'report-highlight', metadata: { highlightText: 'Hi' } })
			)
		)

		await updateEditorialTagMetadata('article-id', 'report-highlight', { highlightText: 'Hi' }, fetchFn)

		const [url, options] = fetchFn.mock.calls[0]
		expect(new URL(url).pathname).toBe('/articles/article-id/editorial-tags/report-highlight')
		expect(options?.method).toBe('PATCH')
		expect(JSON.parse(String(options?.body))).toEqual({ metadata: { highlightText: 'Hi' } })
	})

	it('patches highlighted report sponsor logo', async () => {
		const fetchFn = createFetchMock(
			new Response(
				JSON.stringify({
					article: {
						id: 'article-id',
						title: 'Report',
						slug: 'report',
						status: 'published',
						sponsorLogo: { url: 'https://features.llama.fi/uploads/image/logo-id' }
					}
				})
			)
		)

		await updateReportHighlightSponsorLogo(
			'article-id',
			{ url: 'https://features.llama.fi/uploads/image/logo-id' },
			fetchFn
		)

		const [url, options] = fetchFn.mock.calls[0]
		expect(new URL(url).pathname).toBe('/articles/article-id/report-highlight/sponsor-logo')
		expect(options?.method).toBe('PATCH')
		expect(JSON.parse(String(options?.body))).toEqual({
			sponsorLogo: { url: 'https://features.llama.fi/uploads/image/logo-id' }
		})
	})

	it('requests the all-articles banner lookup path', async () => {
		const fetchFn = createFetchMock(new Response(JSON.stringify({ text: null, image: null, imageHorizontal: null })))

		await getAllArticlesBanner(fetchFn)

		const url = new URL(fetchFn.mock.calls[0][0])
		expect(url.pathname).toBe('/banners/lookup/all-articles')
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
