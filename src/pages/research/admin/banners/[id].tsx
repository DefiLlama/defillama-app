import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { BannerForm } from '~/containers/Articles/admin/BannerForm'
import { ArticleApiError, getBanner } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import type { Banner } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

function EditBannerInner({ id }: { id: string }) {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const {
		data: banner,
		isLoading,
		error
	} = useQuery<Banner>({
		queryKey: ['research', 'admin', 'banner', id],
		queryFn: () => getBanner(id, authorizedFetch),
		enabled: !!id && isAuthenticated && !loaders.userLoading,
		retry: false
	})

	if (isLoading) {
		return <div className="mx-auto py-24 text-center text-sm text-(--text-tertiary)">Loading…</div>
	}

	if (error || !banner) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load banner'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load banner</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
				<Link href="/research/admin/banners" className="text-sm text-(--link-text) hover:underline">
					Back to banners
				</Link>
			</div>
		)
	}

	return (
		<>
			<div className="mx-auto grid w-full max-w-4xl gap-0 px-1">
				<header className="pt-2 pb-2">
					<Link
						href="/research/admin/banners"
						className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
					>
						<span aria-hidden>←</span> Banners
					</Link>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-(--text-primary)">Edit banner</h1>
				</header>
			</div>
			<BannerForm banner={banner} />
		</>
	)
}

export default function EditBannerPage() {
	const router = useRouter()
	const id =
		typeof router.query.id === 'string' ? router.query.id : Array.isArray(router.query.id) ? router.query.id[0] : ''
	return (
		<Layout
			title="Edit banner - Research Admin - DefiLlama"
			description="Edit a research banner."
			canonicalUrl={`/research/admin/banners/${id || ''}`}
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>{id ? <EditBannerInner id={id} /> : null}</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
