import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ArticleApiError, getArticleBySlug } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { ArticleRenderer } from '~/containers/Articles/renderer/ArticleRenderer'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument } from '~/containers/Articles/types'
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

function ArticleBySlugContent({ slug }: { slug: string }) {
	const { authorizedFetch } = useAuthContext()
	const [article, setArticle] = useState<ArticleDocument | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [notFound, setNotFound] = useState(false)

	useEffect(() => {
		if (!slug) return
		let cancelled = false
		setIsLoading(true)
		getArticleBySlug(slug, authorizedFetch)
			.then((doc) => {
				if (cancelled) return
				if (!doc) {
					setNotFound(true)
				} else {
					setArticle(doc)
					setError(null)
				}
			})
			.catch((err) => {
				if (cancelled) return
				setError(err instanceof ArticleApiError ? err.message : 'Failed to load research')
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [authorizedFetch, slug])

	if (isLoading) {
		return <ResearchLoader />
	}

	if (notFound) {
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
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load research</h1>
				<p className="text-sm text-(--text-secondary)">{error}</p>
			</div>
		)
	}

	return (
		<>
			<Head>
				{article.seoTitle ? <title>{article.seoTitle}</title> : null}
				{article.seoTitle ? <meta key="og:title" property="og:title" content={article.seoTitle} /> : null}
				{article.seoTitle ? <meta key="twitter:title" name="twitter:title" content={article.seoTitle} /> : null}
				{article.seoDescription ? <meta key="description" name="description" content={article.seoDescription} /> : null}
				{article.seoDescription ? (
					<meta key="og:description" property="og:description" content={article.seoDescription} />
				) : null}
				{article.seoDescription ? (
					<meta key="twitter:description" name="twitter:description" content={article.seoDescription} />
				) : null}
				{article.coverImage?.url ? <meta key="og:image" property="og:image" content={article.coverImage.url} /> : null}
				{article.coverImage?.url ? (
					<meta key="twitter:image" name="twitter:image" content={article.coverImage.url} />
				) : null}
			</Head>
			<AppMetadataProvider>
				{article.status === 'draft' ? (
					<div className="mx-auto mt-4 flex w-full max-w-[1180px] items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-600 sm:px-6">
						<span className="flex items-center gap-2">
							<span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
							Draft preview · only visible to authors
						</span>
						<Link
							href={`/research/edit/${article.id}`}
							className="font-medium text-amber-600 hover:underline"
						>
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

export default function ArticlePage() {
	const router = useRouter()
	const slug = typeof router.query.slug === 'string' ? router.query.slug : ''

	return (
		<Layout
			title="Research - DefiLlama"
			description="DefiLlama research."
			canonicalUrl={slug ? `/research/${slug}` : '/research'}
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate loadingFallback={<ResearchLoader />}>
					{slug ? <ArticleBySlugContent slug={slug} /> : <ResearchLoader />}
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
