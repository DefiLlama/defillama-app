import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArticleApiError, getArticleBySlug } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate, canEditResearchArticle } from '~/containers/Articles/ArticlesAccessGate'
import { ArticleSeo } from '~/containers/Articles/ArticleSeo'
import { ArticleBannerStrip } from '~/containers/Articles/renderer/ArticleBannerStrip'
import { ArticleRenderer } from '~/containers/Articles/renderer/ArticleRenderer'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import { getArticlesFetchFromRequest } from '~/containers/Articles/server/auth'
import { fetchPublishedArticleBySlug } from '~/containers/Articles/server/queries'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_FROM_SLUG, ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

function OwnerEditChip({ article }: { article: ArticleDocument }) {
	const { user, isAuthenticated } = useAuthContext()
	const canEdit = canEditResearchArticle({ article, isAuthenticated, user })
	if (!canEdit) return null
	return (
		<div className="pointer-events-none fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 justify-center sm:bottom-8">
			<Link
				href={`/research/edit/${article.id}`}
				className="pointer-events-auto flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm font-medium text-(--text-primary) shadow-lg transition-colors hover:border-(--link-text)/40 hover:text-(--link-text)"
			>
				<svg
					viewBox="0 0 24 24"
					className="h-4 w-4"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.75"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M12 20h9" />
					<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
				</svg>
				Edit research
			</Link>
		</div>
	)
}

function SectionArticle({
	initialArticle,
	slug,
	sectionSlug
}: {
	initialArticle: ArticleDocument | null
	slug: string
	sectionSlug: string
}) {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const needsClientFetch = initialArticle === null

	const articleQuery = useQuery({
		queryKey: ['research', 'article', slug],
		queryFn: async () => {
			const article = await getArticleBySlug(slug, authorizedFetch)
			if (!article || article.status !== 'published') return null
			return article
		},
		enabled: needsClientFetch && isAuthenticated && !loaders.userLoading && !!slug,
		retry: false,
		initialData: initialArticle ?? undefined
	})

	if (needsClientFetch && (loaders.userLoading || articleQuery.isLoading)) {
		return <ResearchLoader />
	}

	const article = articleQuery.data ?? null

	if (!article && !articleQuery.error) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Research not found</h1>
				<Link href="/research" className="text-sm text-(--link-text) hover:underline">
					Browse all research →
				</Link>
			</div>
		)
	}

	if (articleQuery.error || !article) {
		const message =
			articleQuery.error instanceof ArticleApiError ? articleQuery.error.message : 'Failed to load research'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn&apos;t load research</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
			</div>
		)
	}

	const expectedSection = ARTICLE_SECTION_FROM_SLUG[sectionSlug]
	if (article.section && expectedSection && article.section !== expectedSection) {
		return <ResearchLoader />
	}

	return (
		<>
			<ArticleSeo article={article} />
			<ArticleBannerStrip scope="article" articleId={article.id} section={article.section ?? null} />
			<AppMetadataProvider>
				<ArticleRenderer article={article} />
				<OwnerEditChip article={article} />
			</AppMetadataProvider>
		</>
	)
}

type SectionArticlePageProps = {
	article: ArticleDocument | null
	sectionSlug: string
	slug: string
}

const getServerSidePropsHandler: GetServerSideProps<SectionArticlePageProps> = async (context) => {
	context.res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')

	const sectionSlug = typeof context.params?.section === 'string' ? context.params.section : ''
	const slug = typeof context.params?.slug === 'string' ? context.params.slug : ''
	const expectedSection = ARTICLE_SECTION_FROM_SLUG[sectionSlug]

	if (!expectedSection || !slug) {
		return { notFound: true }
	}

	const fetchFn = getArticlesFetchFromRequest(context.req)
	if (!fetchFn) {
		return { props: { article: null, sectionSlug, slug } }
	}

	try {
		const article = await fetchPublishedArticleBySlug(slug, fetchFn)
		if (!article) {
			return { notFound: true }
		}

		if (article.section && ARTICLE_SECTION_SLUGS[article.section] !== sectionSlug) {
			return {
				redirect: {
					destination: `/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}`,
					permanent: true
				}
			}
		}

		return { props: { article, sectionSlug, slug } }
	} catch {
		return { props: { article: null, sectionSlug, slug } }
	}
}

export const getServerSideProps = withServerSidePropsTelemetry('/research/[section]/[slug]', getServerSidePropsHandler)

export default function SectionArticlePage({ article, sectionSlug, slug }: SectionArticlePageProps) {
	const layoutTitle = article?.seoTitle || article?.title || 'Research - DefiLlama'
	const layoutDescription = article?.seoDescription || article?.excerpt || article?.subtitle || 'DefiLlama research.'
	const canonical = `/research/${sectionSlug}/${slug}`

	return (
		<Layout title={layoutTitle} description={layoutDescription} canonicalUrl={canonical} hideDesktopSearch>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate loadingFallback={<ResearchLoader />}>
					<SectionArticle initialArticle={article} slug={slug} sectionSlug={sectionSlug} />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
