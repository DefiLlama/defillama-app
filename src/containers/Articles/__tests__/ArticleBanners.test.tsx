import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArticleBannerStrip } from '../renderer/ArticleBannerStrip'
import { ArticleImageBanner } from '../renderer/ArticleImageBanner'
import type { Banner, BannerLookupResult } from '../types'

const queryState = vi.hoisted(() => ({
	lookups: new Map<string, BannerLookupResult>()
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: vi.fn(({ queryKey, enabled = true }: { queryKey: unknown[]; enabled?: boolean }) => ({
		data: enabled ? queryState.lookups.get(JSON.stringify(queryKey)) : undefined,
		isLoading: false
	}))
}))

vi.mock('~/containers/Subscription/auth', () => ({
	useAuthContext: () => ({
		authorizedFetch: vi.fn(),
		isAuthenticated: true,
		loaders: { userLoading: false }
	})
}))

const emptyLookup = (): BannerLookupResult => ({ text: null, image: null, imageHorizontal: null })

const banner = (overrides: Partial<Banner>): Banner => ({
	id: 'banner-id',
	type: 'text',
	scope: 'all_articles',
	section: null,
	articleId: null,
	text: null,
	linkUrl: null,
	linkLabel: null,
	imageUrl: null,
	imageAlt: null,
	enabled: true,
	createdByPbUserId: 'user-id',
	createdAt: '2026-05-14T00:00:00.000Z',
	updatedAt: '2026-05-14T00:00:00.000Z',
	...overrides
})

describe('article banners', () => {
	beforeEach(() => {
		queryState.lookups.clear()
	})

	it('falls back from article text to section text to all-articles text', () => {
		queryState.lookups.set(JSON.stringify(['research', 'banner', 'article', 'article-id']), emptyLookup())
		queryState.lookups.set(JSON.stringify(['research', 'banner', 'section', 'report']), emptyLookup())
		queryState.lookups.set(JSON.stringify(['research', 'banner', 'all-articles']), {
			...emptyLookup(),
			text: banner({ id: 'global-text', text: 'Global strip' })
		})

		expect(
			renderToStaticMarkup(<ArticleBannerStrip scope="article" articleId="article-id" section="report" />)
		).toContain('Global strip')

		queryState.lookups.set(JSON.stringify(['research', 'banner', 'section', 'report']), {
			...emptyLookup(),
			text: banner({ id: 'section-text', scope: 'section', text: 'Section strip' })
		})

		const sectionHtml = renderToStaticMarkup(
			<ArticleBannerStrip scope="article" articleId="article-id" section="report" />
		)
		expect(sectionHtml).toContain('Section strip')
		expect(sectionHtml).not.toContain('Global strip')

		queryState.lookups.set(JSON.stringify(['research', 'banner', 'article', 'article-id']), {
			...emptyLookup(),
			text: banner({ id: 'article-text', scope: 'article', text: 'Article strip' })
		})

		const articleHtml = renderToStaticMarkup(
			<ArticleBannerStrip scope="article" articleId="article-id" section="report" />
		)
		expect(articleHtml).toContain('Article strip')
		expect(articleHtml).not.toContain('Section strip')
	})

	it('falls back to all-articles image banners when article and section images are absent', () => {
		queryState.lookups.set(JSON.stringify(['research', 'banner', 'article', 'article-id']), emptyLookup())
		queryState.lookups.set(JSON.stringify(['research', 'banner', 'section', 'report']), emptyLookup())
		queryState.lookups.set(JSON.stringify(['research', 'banner', 'all-articles']), {
			...emptyLookup(),
			image: banner({
				id: 'global-image',
				type: 'image',
				imageUrl: '/uploads/image/global',
				imageAlt: 'Global image'
			})
		})

		const html = renderToStaticMarkup(<ArticleImageBanner articleId="article-id" section="report" />)

		expect(html).toContain('/uploads/image/global')
		expect(html).toContain('Global image')
	})
})
