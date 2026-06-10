import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ArticleSeo } from '~/containers/Articles/ArticleSeo'
import type { ArticleAuthorProfile, ArticleDocument } from '~/containers/Articles/types'

vi.mock('next/head', () => ({
	default: ({ children }: { children: ReactNode }) => <>{children}</>
}))

const author: ArticleAuthorProfile = {
	id: 'profile-1',
	pbUserId: 'pb-user-1',
	slug: 'jane-doe',
	displayName: 'Jane Doe',
	socials: {},
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z'
}

function makeArticle(): ArticleDocument {
	return {
		id: 'article-1',
		contentVersion: 1,
		rendererVersion: 1,
		editorSchemaVersion: 1,
		title: 'Sample Research',
		slug: 'sample-research',
		status: 'published',
		author: 'Jane Doe',
		authorProfile: author,
		coAuthors: [
			{
				slug: 'john-doe',
				displayName: 'John Doe',
				socials: {},
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			}
		],
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
		publishedAt: '2026-03-02T00:00:00.000Z'
	}
}

describe('ArticleSeo rendered metadata', () => {
	it('renders repeated Open Graph article author tags', () => {
		const html = renderToStaticMarkup(<ArticleSeo article={makeArticle()} />)
		expect(html).toContain(
			'<meta property="article:author" content="https://defillama.com/research/authors/jane-doe"/>'
		)
		expect(html).toContain(
			'<meta property="article:author" content="https://defillama.com/research/authors/john-doe"/>'
		)
	})
})
