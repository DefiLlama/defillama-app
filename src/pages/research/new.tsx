import dynamic from 'next/dynamic'
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

export default function NewArticlePage() {
	return (
		<Layout
			title="Research editor - DefiLlama"
			description="Editor for DefiLlama research."
			canonicalUrl="/research/new"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<AppMetadataProvider>
					<ArticlesAccessGate>
						<ArticleEditorClient />
					</ArticlesAccessGate>
				</AppMetadataProvider>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
