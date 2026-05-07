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
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">Loading research editor...</div>
		)
	}
)

export default function EditArticlePage() {
	const router = useRouter()
	const id = typeof router.query.id === 'string' ? router.query.id : undefined

	return (
		<Layout
			title="Edit research - DefiLlama"
			description="Edit a DefiLlama research draft."
			canonicalUrl={id ? `/research/edit/${id}` : '/research/edit'}
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
