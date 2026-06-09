import { describe, expect, it } from 'vitest'
import { buildArticleJsonLd, getArticleOpenGraphAuthorUrls } from '~/containers/Articles/ArticleSeo'
import type { ArticleAuthorProfile, ArticleDocument } from '~/containers/Articles/types'

const author: ArticleAuthorProfile = {
	id: 'profile-1',
	pbUserId: 'pb-user-1',
	slug: 'jane-doe',
	displayName: 'Jane Doe',
	bio: null,
	avatarUrl: null,
	socials: {
		x: 'https://x.com/janedoe'
	},
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z'
}

const coAuthor: ArticleAuthorProfile = {
	id: 'profile-2',
	pbUserId: 'pb-user-2',
	slug: 'john-doe',
	displayName: 'John Doe',
	bio: null,
	avatarUrl: null,
	socials: {
		linkedin: 'https://www.linkedin.com/in/johndoe/'
	},
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z'
}

function makeArticle(overrides: Partial<ArticleDocument> = {}): ArticleDocument {
	return {
		id: 'article-1',
		contentVersion: 1,
		rendererVersion: 1,
		editorSchemaVersion: 1,
		title: 'Sample Research',
		slug: 'sample-research',
		status: 'published',
		author: author.displayName,
		authorProfile: author,
		contentJson: { type: 'doc', content: [] },
		plainText: '',
		entities: [],
		charts: [],
		citations: [],
		embeds: [],
		tags: ['defi'],
		section: 'report',
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
		publishedAt: '2026-03-02T00:00:00.000Z',
		firstPublishedAt: '2026-03-02T00:00:00.000Z',
		lastPublishedAt: '2026-03-03T00:00:00.000Z',
		...overrides
	}
}

function jsonLdAuthors(article: ArticleDocument): Array<Record<string, unknown>> {
	return buildArticleJsonLd(article).author as Array<Record<string, unknown>>
}

describe('ArticleSeo metadata authors', () => {
	it('emits primary and co-author Person entries in Article JSON-LD', () => {
		const article = makeArticle({ coAuthors: [coAuthor] })
		const authors = jsonLdAuthors(article)

		expect(authors).toHaveLength(2)
		expect(authors[0]).toMatchObject({
			'@type': 'Person',
			'@id': 'https://defillama.com/research/authors/jane-doe',
			name: 'Jane Doe',
			url: 'https://defillama.com/research/authors/jane-doe',
			sameAs: ['https://x.com/janedoe'],
			worksFor: {
				'@type': 'Organization',
				name: 'DefiLlama Research'
			}
		})
		expect(authors[1]).toMatchObject({
			'@type': 'Person',
			'@id': 'https://defillama.com/research/authors/john-doe',
			name: 'John Doe',
			url: 'https://defillama.com/research/authors/john-doe',
			sameAs: ['https://www.linkedin.com/in/johndoe/']
		})
		expect(JSON.stringify(buildArticleJsonLd(article))).not.toContain('pb-user')
	})

	it('emits DefiLlama Research plus visible people for brand-byline articles', () => {
		const article = makeArticle({
			author: 'Internal Admin',
			brandByline: true,
			coAuthors: [coAuthor]
		})
		const authors = jsonLdAuthors(article)

		expect(authors).toHaveLength(2)
		expect(authors[0]).toMatchObject({
			'@type': 'Organization',
			'@id': 'https://defillama.com/research',
			name: 'DefiLlama Research',
			url: 'https://defillama.com/research'
		})
		expect(authors[1]).toMatchObject({
			'@type': 'Person',
			name: 'John Doe',
			url: 'https://defillama.com/research/authors/john-doe'
		})
	})

	it('returns repeated Open Graph article author URLs in metadata order', () => {
		expect(getArticleOpenGraphAuthorUrls(makeArticle({ coAuthors: [coAuthor] }))).toEqual([
			'https://defillama.com/research/authors/jane-doe',
			'https://defillama.com/research/authors/john-doe'
		])
		expect(getArticleOpenGraphAuthorUrls(makeArticle({ brandByline: true, coAuthors: [coAuthor] }))).toEqual([
			'https://defillama.com/research',
			'https://defillama.com/research/authors/john-doe'
		])
	})
})
