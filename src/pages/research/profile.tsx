import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { AuthorProfileForm } from '~/containers/Articles/profile/AuthorProfileForm'
import Layout from '~/layout'

export default function AuthorProfilePage() {
	return (
		<Layout
			title="Profile - DefiLlama"
			description="Edit your author profile."
			canonicalUrl="/research/profile"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>
					<AuthorProfileForm />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
