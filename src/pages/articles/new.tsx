import dynamic from 'next/dynamic'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
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

export default function NewArticlePage() {
	return (
		<Layout
			title="Article Editor - DefiLlama"
			description="Local article editor for DefiLlama research pages."
			canonicalUrl="/articles/new"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<AppMetadataProvider>
					<ArticleEditorClient />
				</AppMetadataProvider>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
