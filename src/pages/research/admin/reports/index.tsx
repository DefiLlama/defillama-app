import { ReportsAdminView } from '~/containers/Articles/admin/ReportsAdminView'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import Layout from '~/layout'

export default function ReportsAdminListPage() {
	return (
		<Layout
			title="Reports - Research Admin - DefiLlama"
			description="Manage report PDFs, carousel imagery, sponsor logos, and descriptions."
			canonicalUrl="/research/admin/reports"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>
					<ReportsAdminView />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
