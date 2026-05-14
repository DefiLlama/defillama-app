import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { ArticleApiError, getArticleBySlug } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { ArticleSeo } from '~/containers/Articles/ArticleSeo'
import { ArticleBannerStrip } from '~/containers/Articles/renderer/ArticleBannerStrip'
import { ArticleRenderer } from '~/containers/Articles/renderer/ArticleRenderer'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_FROM_SLUG, ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

function OwnerEditChip({ article }: { article: ArticleDocument }) {
	const { user, isAuthenticated } = useAuthContext()
	const canEdit =
		article.viewerRole === 'owner' ||
		article.viewerRole === 'collaborator' ||
		(isAuthenticated && !!user?.id && !!article.authorProfile?.pbUserId && user.id === article.authorProfile.pbUserId)
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

function SectionArticleContent({ slug, sectionSlug }: { slug: string; sectionSlug: string }) {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()
	const expectedSection = ARTICLE_SECTION_FROM_SLUG[sectionSlug]
	const {
		data: article = null,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research', 'article', slug],
		queryFn: () => getArticleBySlug(slug, authorizedFetch),
		enabled: !!slug && !!expectedSection,
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
			<ArticleBannerStrip scope="article" articleId={article.id} section={article.section ?? null} />
			<AppMetadataProvider>
				{article.status === 'draft' ? (
					<div className="mx-auto mt-4 flex w-full max-w-[1180px] items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-600 sm:px-6">
						<span className="flex items-center gap-2">
							<span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
							Draft preview · only visible to authors
						</span>
						<Link href={`/research/edit/${article.id}`} className="font-medium text-amber-600 hover:underline">
							Edit
						</Link>
					</div>
				) : null}
				<ArticleRenderer article={article} />
				<OwnerEditChip article={article} />
			</AppMetadataProvider>
		</>
	)
}

export default function SectionArticlePage() {
	const router = useRouter()
	const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
	const sectionSlug = typeof router.query.section === 'string' ? router.query.section : ''
	const expectedSection = ARTICLE_SECTION_FROM_SLUG[sectionSlug]
	const canonical = expectedSection ? `/research/${sectionSlug}/${slug}` : '/research'
	const noIndex = !expectedSection

	return (
		<Layout
			title="Research - DefiLlama"
			description="DefiLlama research."
			canonicalUrl={canonical}
			noIndex={noIndex}
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate loadingFallback={<ResearchLoader />}>
					{slug && sectionSlug ? <SectionArticleContent slug={slug} sectionSlug={sectionSlug} /> : <ResearchLoader />}
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
