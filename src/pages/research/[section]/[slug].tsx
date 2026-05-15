import { useQuery } from '@tanstack/react-query'
import type { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import {
	ArticleApiError,
	getAllArticlesBanner,
	getArticleBanner,
	getArticleBySlug,
	getSectionBanner,
	listArticlePaths,
	type ArticlePathItem
} from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { canEditResearchArticle } from '~/containers/Articles/ArticlesAccessGate'
import { ArticleSeo } from '~/containers/Articles/ArticleSeo'
import {
	ArticleBannerStrip,
	type ArticleBannerStripInitialData
} from '~/containers/Articles/renderer/ArticleBannerStrip'
import { ArticleRenderer } from '~/containers/Articles/renderer/ArticleRenderer'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_FROM_SLUG, ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

type ArticleRouteParams = {
	section: string
	slug: string
}

type SectionArticlePageProps = {
	initialArticle: ArticleDocument
	initialBanners: ArticleBannerStripInitialData
}

async function loadArticleBannerData(article: ArticleDocument): Promise<ArticleBannerStripInitialData> {
	const [articleBanner, sectionBanner, allArticlesBanner] = await Promise.all([
		getArticleBanner(article.id).catch(() => null),
		article.section ? getSectionBanner(article.section).catch(() => null) : Promise.resolve(null),
		getAllArticlesBanner().catch(() => null)
	])
	return {
		article: articleBanner,
		section: sectionBanner,
		allArticles: allArticlesBanner
	}
}

export const getStaticPaths: GetStaticPaths<ArticleRouteParams> = async () => {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const { items } = await listArticlePaths()
	const paths = articlePathsToStaticPaths(items)

	return {
		paths,
		fallback: 'blocking'
	}
}

export function articlePathsToStaticPaths(items: ArticlePathItem[]) {
	return items.flatMap((item) => {
		const sectionSlug = ARTICLE_SECTION_SLUGS[item.section]
		if (!sectionSlug) return []
		return [
			{
				params: {
					section: sectionSlug,
					slug: item.slug
				}
			}
		]
	})
}

export const getStaticProps = withPerformanceLogging<SectionArticlePageProps, ArticleRouteParams>(
	'research/[section]/[slug]',
	async ({ params }: GetStaticPropsContext<ArticleRouteParams>) => {
		const sectionSlug = params?.section
		const slug = params?.slug
		if (!sectionSlug || !slug) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const expectedSection = ARTICLE_SECTION_FROM_SLUG[sectionSlug]
		if (!expectedSection) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const article = await getArticleBySlug(slug)
		if (!article || !article.section) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const canonicalSectionSlug = ARTICLE_SECTION_SLUGS[article.section]
		if (article.slug !== slug || article.section !== expectedSection) {
			return {
				redirect: {
					destination: `/research/${canonicalSectionSlug}/${article.slug}`,
					permanent: false
				}
			}
		}

		return {
			props: {
				initialArticle: article,
				initialBanners: await loadArticleBannerData(article)
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

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

function SectionArticleContent({
	slug,
	sectionSlug,
	initialArticle,
	initialBanners
}: {
	slug: string
	sectionSlug: string
	initialArticle?: ArticleDocument | null
	initialBanners?: ArticleBannerStripInitialData | null
}) {
	const router = useRouter()
	const expectedSection = ARTICLE_SECTION_FROM_SLUG[sectionSlug]
	const {
		data: article = null,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research', 'article', slug],
		queryFn: () => getArticleBySlug(slug),
		enabled: !!slug && !!expectedSection,
		initialData: initialArticle?.slug === slug ? initialArticle : undefined,
		staleTime: 60_000,
		retry: false
	})

	useEffect(() => {
		if (!article) return
		const sectionMismatch = !!article.section && article.section !== expectedSection
		const slugMismatch = article.slug !== slug
		if (!sectionMismatch && !slugMismatch) return
		const canonicalSectionSlug = article.section ? ARTICLE_SECTION_SLUGS[article.section] : sectionSlug
		void router.replace(`/research/${canonicalSectionSlug}/${article.slug}`)
	}, [article, expectedSection, slug, sectionSlug, router])

	if (!expectedSection) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Section not found</h1>
				<Link href="/research" className="text-sm text-(--link-text) hover:underline">
					Browse all research →
				</Link>
			</div>
		)
	}

	if (isLoading) {
		return <ResearchLoader />
	}

	if (!article && !error) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Research not found</h1>
				<Link href="/research" className="text-sm text-(--link-text) hover:underline">
					Browse all research →
				</Link>
			</div>
		)
	}

	if (error || !article) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load research'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load research</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
			</div>
		)
	}

	const sectionMismatch = article.section ? article.section !== expectedSection : false
	const slugMismatch = article.slug !== slug

	if ((sectionMismatch || slugMismatch) && article.status === 'published') {
		return <ResearchLoader />
	}

	return (
		<>
			<ArticleSeo article={article} />
			<ArticleBannerStrip
				scope="article"
				articleId={article.id}
				section={article.section ?? null}
				initialData={initialBanners}
			/>
			<AppMetadataProvider>
				<ArticleRenderer article={article} />
				<OwnerEditChip article={article} />
			</AppMetadataProvider>
		</>
	)
}

export default function SectionArticlePage({
	initialArticle,
	initialBanners
}: InferGetStaticPropsType<typeof getStaticProps>) {
	const router = useRouter()
	const initialSectionSlug = initialArticle?.section ? ARTICLE_SECTION_SLUGS[initialArticle.section] : ''
	const slug = typeof router.query.slug === 'string' ? router.query.slug : (initialArticle?.slug ?? '')
	const sectionSlug = typeof router.query.section === 'string' ? router.query.section : initialSectionSlug
	const expectedSection = ARTICLE_SECTION_FROM_SLUG[sectionSlug]
	const canonical =
		initialArticle?.section && initialArticle.slug
			? `/research/${ARTICLE_SECTION_SLUGS[initialArticle.section]}/${initialArticle.slug}`
			: expectedSection
				? `/research/${sectionSlug}/${slug}`
				: '/research'
	const noIndex = !expectedSection
	const title = initialArticle?.seoTitle || initialArticle?.title || 'Research - DefiLlama'
	const description = initialArticle?.seoDescription || initialArticle?.excerpt || 'DefiLlama research.'

	return (
		<Layout title={title} description={description} canonicalUrl={canonical} noIndex={noIndex} hideDesktopSearch>
			<ArticleProxyAuthProvider>
				{slug && sectionSlug ? (
					<SectionArticleContent
						slug={slug}
						sectionSlug={sectionSlug}
						initialArticle={initialArticle}
						initialBanners={initialBanners}
					/>
				) : (
					<ResearchLoader />
				)}
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
