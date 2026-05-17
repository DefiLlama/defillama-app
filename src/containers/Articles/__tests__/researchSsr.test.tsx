import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	getAllArticlesBanner,
	getArticleBanner,
	getArticleBySlug,
	getLandingBanner,
	getSectionBanner,
	listArticles,
	listArticlesByTag
} from '~/containers/Articles/api'
import { ReportsCarousel } from '~/containers/Articles/landing/ReportsCarousel'
import type { ArticleDocument, BannerLookupResult } from '~/containers/Articles/types'
import ArticlesPage, { getStaticProps as getResearchStaticProps } from '~/pages/research'
import SectionArticlePage, {
	articlePathsToStaticPaths,
	getStaticProps as getArticleStaticProps
} from '~/pages/research/[section]/[slug]'

const routerMock = vi.hoisted(() => vi.fn())

vi.mock('next/router', () => ({
	useRouter: () => routerMock()
}))

vi.mock('~/containers/Articles/api', () => ({
	ArticleApiError: class ArticleApiError extends Error {
		status: number
		constructor(message: string, status: number) {
			super(message)
			this.status = status
		}
	},
	getAllArticlesBanner: vi.fn(),
	getArticleBanner: vi.fn(),
	getArticleBySlug: vi.fn(),
	getLandingBanner: vi.fn(),
	getSectionBanner: vi.fn(),
	listArticlePaths: vi.fn(),
	listArticles: vi.fn(),
	listArticlesByTag: vi.fn()
}))

vi.mock('~/containers/Articles/ArticleProxyAuthProvider', () => ({
	ArticleProxyAuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}))

vi.mock('~/containers/ProDashboard/AppMetadataContext', () => ({
	AppMetadataProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}))

vi.mock('~/containers/Subscription/auth', () => ({
	useAuthContext: () => ({
		authorizedFetch: vi.fn(),
		hasActiveSubscription: false,
		isAuthenticated: false,
		loaders: { userLoading: false },
		user: null
	})
}))

vi.mock('~/layout', () => ({
	default: ({ children }: { children: ReactNode }) => <>{children}</>
}))

function renderWithQueryClient(element: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false
			}
		}
	})
	return renderToStaticMarkup(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>)
}

function article(overrides: Partial<ArticleDocument> = {}): ArticleDocument {
	return {
		id: 'article-id',
		contentVersion: 1,
		rendererVersion: 1,
		editorSchemaVersion: 1,
		title: 'Canonical Research',
		subtitle: 'Server-side subtitle',
		slug: 'canonical-research',
		status: 'published',
		seoTitle: 'Canonical Research SEO',
		seoDescription: 'Research rendered on the server.',
		excerpt: 'Research excerpt',
		coverImage: null,
		carouselImage: null,
		sponsorLogo: null,
		reportDescription: null,
		reportPdf: null,
		contentJson: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Server rendered body' }]
				}
			]
		},
		plainText: 'Server rendered body',
		entities: [],
		charts: [],
		citations: [],
		embeds: [],
		tags: ['research'],
		section: 'report',
		displayDate: '2026-05-15T00:00:00.000Z',
		brandByline: true,
		featuredRank: null,
		featuredUntil: null,
		createdAt: '2026-05-15T00:00:00.000Z',
		updatedAt: '2026-05-15T00:00:00.000Z',
		publishedAt: '2026-05-15T00:00:00.000Z',
		firstPublishedAt: '2026-05-15T00:00:00.000Z',
		lastPublishedAt: '2026-05-15T00:00:00.000Z',
		authorProfile: {
			id: 'profile-id',
			pbUserId: 'author-id',
			slug: 'author',
			displayName: 'Research Author',
			bio: null,
			avatarUrl: null,
			socials: {},
			createdAt: '2026-05-15T00:00:00.000Z',
			updatedAt: '2026-05-15T00:00:00.000Z'
		},
		coAuthors: [],
		interviewees: null,
		pending: null,
		pendingUpdatedAt: null,
		pendingActorPbUserId: null,
		editorialTags: [],
		...overrides
	}
}

function articleList(items: ArticleDocument[]) {
	return {
		items,
		page: 1,
		perPage: items.length,
		totalItems: items.length,
		totalPages: 1
	}
}

const emptyBanner: BannerLookupResult = {
	text: null,
	image: null,
	imageHorizontal: null
}

describe('research ISR data loading', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		routerMock.mockReturnValue({
			isReady: false,
			pathname: '/research',
			query: {},
			replace: vi.fn()
		})
		vi.mocked(listArticles).mockResolvedValue(articleList([article()]))
		vi.mocked(listArticlesByTag).mockResolvedValue({ items: [article()] })
		vi.mocked(getLandingBanner).mockResolvedValue(emptyBanner)
		vi.mocked(getArticleBanner).mockResolvedValue(emptyBanner)
		vi.mocked(getSectionBanner).mockResolvedValue(emptyBanner)
		vi.mocked(getAllArticlesBanner).mockResolvedValue(emptyBanner)
	})

	it('loads landing page props for ISR and renders article content immediately', async () => {
		const result = await getResearchStaticProps({} as never)

		expect(result).toMatchObject({ revalidate: expect.any(Number) })
		if (!('props' in result)) throw new Error('expected props')
		expect(result.props.landingData.heroReports[0]?.title).toBe('Canonical Research')
		expect(getLandingBanner).toHaveBeenCalledTimes(1)

		const html = renderWithQueryClient(<ArticlesPage {...result.props} />)
		expect(html).toContain('Canonical Research')
	})

	it('server-renders the reports carousel centered before client measurement', () => {
		const html = renderToStaticMarkup(
			<ReportsCarousel
				showButtons={false}
				reports={Array.from({ length: 5 }, (_, index) =>
					article({
						id: `article-${index}`,
						slug: `article-${index}`,
						title: `Article ${index}`
					})
				)}
			/>
		)

		expect(html).toContain('left:50%')
		expect(html).toContain('translateX(calc(-50% + 0px)) scale(1)')
		expect(html).not.toContain('translate(calc(0px + -147px))')
	})

	it('maps public article path metadata into static paths', () => {
		expect(
			articlePathsToStaticPaths([
				{
					slug: 'canonical-research',
					section: 'report',
					updatedAt: '2026-05-15T00:00:00.000Z'
				}
			])
		).toEqual([
			{
				params: {
					section: 'report',
					slug: 'canonical-research'
				}
			}
		])
	})

	it('loads article props for ISR and renders article body immediately', async () => {
		const publicArticle = article()
		vi.mocked(getArticleBySlug).mockResolvedValue(publicArticle)

		const result = await getArticleStaticProps({
			params: { section: 'report', slug: 'canonical-research' }
		} as never)

		expect(result).toMatchObject({ revalidate: expect.any(Number) })
		if (!('props' in result)) throw new Error('expected props')
		expect(result.props.initialArticle.title).toBe('Canonical Research')
		expect(getArticleBanner).toHaveBeenCalledWith('article-id')

		routerMock.mockReturnValue({
			isReady: true,
			pathname: '/research/[section]/[slug]',
			query: { section: 'report', slug: 'canonical-research' },
			replace: vi.fn()
		})
		const html = renderWithQueryClient(<SectionArticlePage {...result.props} />)
		expect(html).toContain('Canonical Research')
		expect(html).toContain('Server rendered body')
	})

	it('does not render legacy draft preview controls on the public article page', () => {
		routerMock.mockReturnValue({
			isReady: true,
			pathname: '/research/[section]/[slug]',
			query: { section: 'report', slug: 'canonical-research' },
			replace: vi.fn()
		})

		const html = renderWithQueryClient(
			<SectionArticlePage initialArticle={article({ status: 'draft' })} initialBanners={{}} />
		)
		expect(html).not.toContain('Draft preview')
	})

	it('returns notFound for missing articles and redirects non-canonical article urls', async () => {
		vi.mocked(getArticleBySlug).mockResolvedValueOnce(null)
		await expect(
			getArticleStaticProps({
				params: { section: 'report', slug: 'missing' }
			} as never)
		).resolves.toMatchObject({ notFound: true })

		vi.mocked(getArticleBySlug).mockResolvedValueOnce(article())
		await expect(
			getArticleStaticProps({
				params: { section: 'report', slug: 'old-research' }
			} as never)
		).resolves.toMatchObject({
			redirect: {
				destination: '/research/report/canonical-research',
				permanent: false
			}
		})
	})
})
