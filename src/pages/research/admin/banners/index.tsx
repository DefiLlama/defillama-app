import { BannersListView } from '~/containers/Articles/admin/BannersListView'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import Layout from '~/layout'

export default function BannersAdminListPage() {
	return (
		<Layout
			title="Banners - Research Admin - DefiLlama"
			description="Manage research banners."
			canonicalUrl="/research/admin/banners"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>
					<BannersListView />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
