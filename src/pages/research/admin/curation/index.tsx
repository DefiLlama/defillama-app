import { EditorialTagsView } from '~/containers/Articles/admin/EditorialTagsView'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import Layout from '~/layout'

export default function ResearchCurationAdminPage() {
	return (
		<Layout
			title="Curation - Research Admin - DefiLlama"
			description="Curate Spotlight and Insights for the research landing page."
			canonicalUrl="/research/admin/curation"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>
					<EditorialTagsView />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
