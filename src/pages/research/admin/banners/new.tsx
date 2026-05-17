import Link from 'next/link'
import { BannerForm } from '~/containers/Articles/admin/BannerForm'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import Layout from '~/layout'

export default function NewBannerPage() {
	return (
		<Layout
			title="New banner - Research Admin - DefiLlama"
			description="Create a research banner."
			canonicalUrl="/research/admin/banners/new"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>
					<div className="mx-auto grid w-full max-w-4xl gap-0 px-1">
						<header className="pt-2 pb-2">
							<Link
								href="/research/admin/banners"
								className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
							>
								<span aria-hidden>←</span> Banners
							</Link>
							<h1 className="mt-2 text-3xl font-semibold tracking-tight text-(--text-primary)">New banner</h1>
						</header>
					</div>
					<BannerForm banner={null} />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
