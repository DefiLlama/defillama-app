import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	ArticleApiError,
	getAllArticlesBanner,
	listArticlePaths,
	listArticles,
	listArticlesByTag,
	publishArticle,
	reorderEditorialTag,
	revalidateResearchLanding,
	setEditorialTag,
	updateEditorialTagMetadata,
	updateReportHighlightSponsorLogo
} from '../api'
import { EDITORIAL_TAGS } from '../editorialTags'

const createFetchMock = (response: Response) => vi.fn(async (_url: string, _options?: RequestInit) => response.clone())

describe('articles api client', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

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

	it('posts editorial tag without body when order is omitted', async () => {
		const fetchFn = createFetchMock(
			new Response(JSON.stringify({ articleId: 'article-id', tag: 'spotlight', order: 0 }))
		)

		await setEditorialTag('article-id', 'spotlight', fetchFn)

		const [url, options] = fetchFn.mock.calls[0]
		expect(new URL(url).pathname).toBe('/articles/article-id/editorial-tags/spotlight')
		expect(options?.method).toBe('POST')
		expect(options?.body).toBeUndefined()
	})

	it('posts editorial tag with optional order', async () => {
		const fetchFn = createFetchMock(
			new Response(JSON.stringify({ articleId: 'article-id', tag: 'spotlight', order: 2 }))
		)

		await setEditorialTag('article-id', 'spotlight', fetchFn, { order: 2 })

		const [url, options] = fetchFn.mock.calls[0]
		expect(new URL(url).pathname).toBe('/articles/article-id/editorial-tags/spotlight')
		expect(options?.method).toBe('POST')
		expect(JSON.parse(String(options?.body))).toEqual({ order: 2 })
	})

	it('patches editorial tag order for drag-and-drop', async () => {
		const fetchFn = createFetchMock(
			new Response(
				JSON.stringify({
					tag: 'spotlight',
					items: [
						{ articleId: 'uuid-a', order: 1 },
						{ articleId: 'uuid-b', order: 0 }
					]
				})
			)
		)

		await reorderEditorialTag(
			'spotlight',
			[
				{ articleId: 'uuid-a', order: 1 },
				{ articleId: 'uuid-b', order: 0 }
			],
			fetchFn
		)

		const [url, options] = fetchFn.mock.calls[0]
		expect(new URL(url).pathname).toBe('/articles/editorial-tags/spotlight/order')
		expect(options?.method).toBe('PATCH')
		expect(JSON.parse(String(options?.body))).toEqual({
			items: [
				{ articleId: 'uuid-a', order: 1 },
				{ articleId: 'uuid-b', order: 0 }
			]
		})
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

	it('routes publish through the local research API proxy', async () => {
		const fetchFn = createFetchMock(new Response(JSON.stringify({ article: { id: 'article-id' } })))

		await publishArticle('article-id', fetchFn)

		const [url, options] = fetchFn.mock.calls[0]
		expect(url).toBe('/api/private/research/articles/article-id/publish')
		expect(options?.method).toBe('POST')
		expect(JSON.parse(options?.body as string)).toEqual({})
	})

	it('sends goLiveAt when scheduling publish', async () => {
		const fetchFn = createFetchMock(new Response(JSON.stringify({ article: { id: 'article-id' } })))

		await publishArticle('article-id', fetchFn, { goLiveAt: '2026-06-01T09:00:00.000Z' })

		const [, options] = fetchFn.mock.calls[0]
		expect(options?.method).toBe('POST')
		expect(JSON.parse(options?.body as string)).toEqual({ goLiveAt: '2026-06-01T09:00:00.000Z' })
	})

	it('sends goLiveAt null when publishing immediately after schedule', async () => {
		const fetchFn = createFetchMock(new Response(JSON.stringify({ article: { id: 'article-id' } })))

		await publishArticle('article-id', fetchFn, { goLiveAt: null })

		const [, options] = fetchFn.mock.calls[0]
		expect(options?.method).toBe('POST')
		expect(JSON.parse(options?.body as string)).toEqual({ goLiveAt: null })
	})

	it('requests research landing revalidation with a nonce', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(1779199600000)
		const fetchFn = createFetchMock(
			new Response(
				JSON.stringify({ cloudflare: { status: 'skipped' }, revalidateErrors: [], revalidated: ['/research'] })
			)
		)

		await revalidateResearchLanding(fetchFn)

		const [url, options] = fetchFn.mock.calls[0]
		expect(url).toBe('/api/private/research/revalidate-landing?_n=1779199600000')
		expect(options?.method).toBe('GET')
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
