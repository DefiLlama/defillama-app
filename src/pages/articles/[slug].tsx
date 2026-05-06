import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ArticleApiError, getArticleBySlug } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { ArticleRenderer } from '~/containers/Articles/renderer/ArticleRenderer'
import type { ArticleDocument } from '~/containers/Articles/types'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

function OwnerEditChip({ article }: { article: ArticleDocument }) {
	const { user, isAuthenticated } = useAuthContext()
	const isOwner =
		isAuthenticated &&
		!!user?.id &&
		!!article.authorProfile?.pbUserId &&
		user.id === article.authorProfile.pbUserId
	if (!isOwner) return null
	return (
		<div className="pointer-events-none fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 justify-center sm:bottom-8">
			<Link
				href={`/articles/edit/${article.id}`}
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
				Edit article
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
				setError(err instanceof ArticleApiError ? err.message : 'Failed to load article')
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [authorizedFetch, slug])

	if (isLoading) {
		return (
			<div className="mx-auto flex max-w-3xl items-center justify-center py-24 text-sm text-(--text-tertiary)">
				Loading…
			</div>
		)
	}

	if (notFound) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Article not found</h1>
				<Link href="/articles" className="text-sm text-(--link-text) hover:underline">
					Browse all articles →
				</Link>
			</div>
		)
	}

	if (error || !article) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load article</h1>
				<p className="text-sm text-(--text-secondary)">{error}</p>
			</div>
		)
	}

	return (
		<>
			{article.coverImage?.url ? (
				<Head>
					<meta property="og:image" content={article.coverImage.url} />
					<meta name="twitter:image" content={article.coverImage.url} />
				</Head>
			) : null}
			<AppMetadataProvider>
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
			title="Article - DefiLlama"
			description="DefiLlama article."
			canonicalUrl={slug ? `/articles/${slug}` : '/articles'}
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>{slug ? <ArticleBySlugContent slug={slug} /> : null}</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
