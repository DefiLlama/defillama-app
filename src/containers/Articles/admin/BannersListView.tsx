import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArticleApiError, deleteBanner, listBanners, updateBanner } from '~/containers/Articles/api'
import type { Banner } from '~/containers/Articles/types'
import { ARTICLE_SECTION_LABELS, BANNER_KIND_LABELS, BANNER_SCOPE_LABELS } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'

export function BannersListView() {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()

	const {
		data: banners,
		isLoading,
		error
	} = useQuery<Banner[]>({
		queryKey: ['research', 'admin', 'banners'],
		queryFn: () => listBanners(authorizedFetch),
		retry: false
	})

	const toggleMutation = useMutation({
		mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateBanner(id, { enabled }, authorizedFetch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['research', 'admin', 'banners'] })
			queryClient.invalidateQueries({ queryKey: ['research', 'banner'] })
		},
		onError: (err) => {
			toast.error(err instanceof ArticleApiError ? err.message : 'Failed to update')
		}
	})

	const deleteBannerMutation = useMutation({
		mutationFn: (id: string) => deleteBanner(id, authorizedFetch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['research', 'admin', 'banners'] })
			queryClient.invalidateQueries({ queryKey: ['research', 'banner'] })
			toast.success('Banner deleted')
		},
		onError: (err) => {
			toast.error(err instanceof ArticleApiError ? err.message : 'Failed to delete')
		}
	})

	if (isLoading) {
		return <div className="mx-auto py-24 text-center text-sm text-(--text-tertiary)">Loading…</div>
	}

	if (error) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load banners'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load banners</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
			</div>
		)
	}

	const items = banners ?? []

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-6 px-1 pb-16">
			<header className="flex flex-wrap items-end justify-between gap-3 pt-2 pb-2">
				<div>
					<Link
						href="/research/admin"
						className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
					>
						<span aria-hidden>←</span> Admin
					</Link>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-(--text-primary)">Banners</h1>
					<p className="mt-1 text-sm text-(--text-secondary)">
						Configure the dismissible top strip, the desktop right-rail image, or the mobile inline image shown on
						/research, all articles, a section's articles, or a single article.
					</p>
				</div>
				<Link
					href="/research/admin/banners/new"
					className="inline-flex min-h-9 items-center bg-(--link-text) px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
				>
					+ New banner
				</Link>
			</header>

			{items.length === 0 ? (
				<div className="rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg) p-10 text-center">
					<p className="text-sm text-(--text-secondary)">No banners yet.</p>
					<Link
						href="/research/admin/banners/new"
						className="mt-3 inline-flex min-h-9 items-center bg-(--link-text) px-3 text-sm font-medium text-white"
					>
						Create your first banner
					</Link>
				</div>
			) : (
				<ul className="grid divide-y divide-(--cards-border) overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{items.map((banner) => (
						<li key={banner.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
							<div className="grid min-w-0 gap-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
										{BANNER_SCOPE_LABELS[banner.scope]}
										{banner.scope === 'section' && banner.section ? ` · ${ARTICLE_SECTION_LABELS[banner.section]}` : ''}
										{banner.scope === 'article' && banner.articleId ? ` · #${banner.articleId.slice(0, 8)}` : ''}
									</span>
									<span className="inline-flex items-center rounded-full bg-(--link-button) px-2 py-0.5 font-jetbrains text-[9px] tracking-[0.18em] text-(--link-text) uppercase">
										{BANNER_KIND_LABELS[banner.type]}
									</span>
									<span
										className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-jetbrains text-[9px] tracking-[0.18em] uppercase ${
											banner.enabled
												? 'bg-emerald-500/10 text-emerald-500'
												: 'bg-(--text-tertiary)/10 text-(--text-tertiary)'
										}`}
									>
										<span aria-hidden className="h-1 w-1 rounded-full bg-current" />
										{banner.enabled ? 'Live' : 'Disabled'}
									</span>
								</div>
								{banner.type === 'text' ? (
									<>
										<p className="line-clamp-2 text-sm text-(--text-primary)">{banner.text}</p>
										{banner.linkUrl ? (
											<p className="truncate text-xs text-(--text-tertiary)">
												→ {banner.linkLabel?.trim() || 'Read more'} · {banner.linkUrl}
											</p>
										) : null}
									</>
								) : (
									<div className="mt-1 flex items-center gap-3">
										{banner.imageUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={banner.imageUrl}
												alt=""
												className={`shrink-0 rounded border border-(--cards-border) object-cover ${
													banner.type === 'image-horizontal' ? 'h-8 w-20' : 'h-12 w-12'
												}`}
											/>
										) : null}
										<p className="line-clamp-2 text-sm text-(--text-secondary)">
											{banner.imageAlt?.trim() || <span className="text-(--text-tertiary) italic">no alt text</span>}
										</p>
									</div>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-2 justify-self-end">
								<button
									type="button"
									onClick={() => toggleMutation.mutate({ id: banner.id, enabled: !banner.enabled })}
									disabled={toggleMutation.isPending}
									className="rounded-md border border-(--cards-border) px-3 py-1.5 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:opacity-50"
								>
									{banner.enabled ? 'Disable' : 'Enable'}
								</button>
								<Link
									href={`/research/admin/banners/${banner.id}`}
									className="rounded-md border border-(--cards-border) px-3 py-1.5 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
								>
									Edit
								</Link>
								<button
									type="button"
									onClick={() => {
										if (window.confirm('Delete this banner? This cannot be undone.')) {
											deleteBannerMutation.mutate(banner.id)
										}
									}}
									disabled={deleteBannerMutation.isPending}
									className="rounded-md px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
								>
									Delete
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
