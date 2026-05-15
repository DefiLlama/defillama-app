import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPublishedArticleBySlug, fetchResearchLandingData, fetchResearchSectionIndex } from '../server/queries'
import type { ArticleDocument } from '../types'

vi.mock('../api', () => ({
	getArticleBySlug: vi.fn(),
	listArticles: vi.fn(),
	listArticlesByTag: vi.fn()
}))

import { getArticleBySlug, listArticles, listArticlesByTag } from '../api'

const publishedArticle = {
	id: '1',
	slug: 'my-article',
	status: 'published',
	section: 'report',
	title: 'My Article'
} as ArticleDocument

const draftArticle = {
	...publishedArticle,
	status: 'draft'
} as ArticleDocument

const mockFetch = vi.fn(async () => new Response(JSON.stringify({ items: [] })))

describe('articles server queries', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('fetchResearchLandingData strips unused article fields from landing payload', async () => {
		vi.mocked(listArticlesByTag).mockResolvedValue({
			items: [
				{
					...publishedArticle,
					contentJson: { type: 'doc', content: [{ type: 'paragraph', text: 'body' }] },
					plainText: 'full body text',
					entities: [{ entityType: 'protocol', slug: 'aave', label: 'Aave', route: '/protocol/aave' }],
					charts: [],
					citations: [],
					embeds: [],
					tags: ['defi'],
					editorialTags: ['latest'],
					seoTitle: 'SEO title',
					seoDescription: 'SEO description'
				}
			]
		})
		vi.mocked(listArticles).mockResolvedValue({
			items: [],
			page: 1,
			perPage: 20,
			totalItems: 0,
			totalPages: 0
		})

		const data = await fetchResearchLandingData(mockFetch)

		for (const article of data.heroReports) {
			expect(article).not.toHaveProperty('contentJson')
			expect(article).not.toHaveProperty('plainText')
			expect(article).not.toHaveProperty('entities')
			expect(article).not.toHaveProperty('charts')
			expect(article).not.toHaveProperty('citations')
			expect(article).not.toHaveProperty('embeds')
			expect(article).not.toHaveProperty('tags')
			expect(article).not.toHaveProperty('editorialTags')
			expect(article).not.toHaveProperty('seoTitle')
			expect(article).not.toHaveProperty('seoDescription')
		}
	})

	it('fetchResearchSectionIndex strips unused article fields', async () => {
		vi.mocked(listArticles).mockResolvedValue({
			items: [
				{
					...publishedArticle,
					contentJson: { type: 'doc', content: [] },
					plainText: 'body',
					tags: ['defi']
				}
			],
			page: 1,
			perPage: 60,
			totalItems: 1,
			totalPages: 1
		})

		const data = await fetchResearchSectionIndex('report', mockFetch)

		expect(data.totalItems).toBe(1)
		expect(data.items[0]).not.toHaveProperty('contentJson')
		expect(data.items[0]).not.toHaveProperty('plainText')
		expect(data.items[0]).not.toHaveProperty('tags')
	})

	it('fetchResearchLandingData returns partial data when one request fails', async () => {
		vi.mocked(listArticlesByTag).mockImplementation(async (tag) => {
			if (tag === 'latest') throw new Error('latest failed')
			return { items: [{ ...publishedArticle, id: tag }] }
		})
		vi.mocked(listArticles).mockResolvedValue({
			items: [publishedArticle],
			page: 1,
			perPage: 20,
			totalItems: 1,
			totalPages: 1
		})

		const data = await fetchResearchLandingData(mockFetch)

		expect(data.latest).toEqual([])
		expect(data.heroReports).toHaveLength(1)
		expect(data.interviews).toHaveLength(1)
	})

	it('fetchResearchLandingData throws when every request fails', async () => {
		vi.mocked(listArticlesByTag).mockRejectedValue(new Error('tag failed'))
		vi.mocked(listArticles).mockRejectedValue(new Error('list failed'))

		await expect(fetchResearchLandingData(mockFetch)).rejects.toThrow('tag failed')
	})

	it('fetchPublishedArticleBySlug returns null for missing or draft articles', async () => {
		vi.mocked(getArticleBySlug).mockResolvedValueOnce(null)
		await expect(fetchPublishedArticleBySlug('missing', mockFetch)).resolves.toBeNull()

		vi.mocked(getArticleBySlug).mockResolvedValueOnce(draftArticle)
		await expect(fetchPublishedArticleBySlug('draft', mockFetch)).resolves.toBeNull()
	})

	it('fetchPublishedArticleBySlug returns published articles', async () => {
		vi.mocked(getArticleBySlug).mockResolvedValueOnce(publishedArticle)
		await expect(fetchPublishedArticleBySlug('my-article', mockFetch)).resolves.toEqual(publishedArticle)
	})
})
