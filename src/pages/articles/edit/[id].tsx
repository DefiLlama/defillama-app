import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import Layout from '~/layout'

const ArticleEditorClient = dynamic(
	() => import('~/containers/Articles/editor/ArticleEditorClient').then((mod) => mod.ArticleEditorClient),
	{
		ssr: false,
		loading: () => (
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">Loading article editor...</div>
		)
	}
)

export default function EditArticlePage() {
	const router = useRouter()
	const id = typeof router.query.id === 'string' ? router.query.id : undefined

	return (
		<Layout
			title="Edit Article - DefiLlama"
			description="Edit a DefiLlama article draft."
			canonicalUrl={id ? `/articles/edit/${id}` : '/articles/edit'}
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<AppMetadataProvider>
					<ArticlesAccessGate>{id ? <ArticleEditorClient articleId={id} /> : null}</ArticlesAccessGate>
				</AppMetadataProvider>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
