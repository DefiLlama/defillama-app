import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { readLocalArticleDocument } from '~/containers/Articles/localStorage'
import { ArticleRenderer } from '~/containers/Articles/renderer/ArticleRenderer'
import type { LocalArticleDocument } from '~/containers/Articles/types'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import Layout from '~/layout'

type PageProps = {
	article: LocalArticleDocument | null
	error?: string
}

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
	try {
		const article = await readLocalArticleDocument()
		return { props: { article } }
	} catch (error) {
		return {
			props: {
				article: null,
				error: error instanceof Error ? error.message : 'Failed to load local article'
			}
		}
	}
}

export default function LocalArticlePage({ article, error }: PageProps) {
	const title = article?.seoTitle || article?.title || 'Local Article - DefiLlama'
	const description = article?.seoDescription || article?.excerpt || 'Local DefiLlama article preview.'
	return (
		<Layout title={title} description={description} canonicalUrl="/articles/local" noIndex>
			{article?.coverImage?.url ? (
				<Head>
					<meta property="og:image" content={article.coverImage.url} />
					<meta name="twitter:image" content={article.coverImage.url} />
				</Head>
			) : null}
			{article ? (
				<ArticleProxyAuthProvider>
					<AppMetadataProvider>
						<ArticleRenderer article={article} />
					</AppMetadataProvider>
				</ArticleProxyAuthProvider>
			) : (
				<div className="mx-auto grid max-w-2xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
					<h1 className="text-2xl font-semibold text-(--text-primary)">No article yet</h1>
					<p className="text-sm text-(--text-secondary)">
						{error || 'Save an article from the editor to generate Article.json.'}
					</p>
					<Link
						href="/articles/new"
						className="mr-auto rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white"
					>
						Open editor
					</Link>
				</div>
			)}
		</Layout>
	)
}
