import { BasicLink } from '~/components/Link'
import type { DashboardSeo, DashboardSeoPublicDashboard } from '../utils/seo'

function formatDate(value: string | null): string | null {
	if (!value) return null
	const time = Date.parse(value)
	if (!Number.isFinite(time)) return null
	return new Date(time).toISOString().slice(0, 10)
}

function formatCount(value: number | undefined): string {
	return String(value ?? 0)
}

export function DashboardSeoSummary({ dashboard, seo }: { dashboard: DashboardSeoPublicDashboard; seo: DashboardSeo }) {
	const updatedDate = formatDate(seo.updated)
	const visibleSummaries = seo.itemSummaries.slice(0, 12)
	const remainingItems = Math.max(0, seo.itemCount - visibleSummaries.length)

	return (
		<section
			aria-labelledby="dashboard-title"
			className="flex flex-col gap-4 rounded-md border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-4"
		>
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<h1 id="dashboard-title" className="text-2xl leading-tight font-semibold text-(--text-primary)">
						{dashboard.data.dashboardName || 'Untitled Dashboard'}
					</h1>
					<p className="rounded-md bg-pro-green-100 px-2 py-1.25 text-xs text-pro-green-400 dark:bg-pro-green-300/20 dark:text-pro-green-200">
						Public dashboard
					</p>
				</div>
				<p className="max-w-4xl text-sm leading-relaxed text-(--text-form)">{seo.description}</p>
			</div>

			<dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
				<div className="rounded-md border border-(--cards-border) bg-(--bg-secondary) px-3 py-2">
					<dt className="text-xs text-(--text-label)">Items</dt>
					<dd className="font-medium">{seo.itemCount}</dd>
				</div>
				<div className="rounded-md border border-(--cards-border) bg-(--bg-secondary) px-3 py-2">
					<dt className="text-xs text-(--text-label)">Updated</dt>
					<dd className="font-medium">{updatedDate ? <time dateTime={updatedDate}>{updatedDate}</time> : 'Unknown'}</dd>
				</div>
				<div className="rounded-md border border-(--cards-border) bg-(--bg-secondary) px-3 py-2">
					<dt className="text-xs text-(--text-label)">Views</dt>
					<dd className="font-medium">{formatCount(dashboard.viewCount)}</dd>
				</div>
				<div className="rounded-md border border-(--cards-border) bg-(--bg-secondary) px-3 py-2">
					<dt className="text-xs text-(--text-label)">Likes</dt>
					<dd className="font-medium">{formatCount(dashboard.likeCount)}</dd>
				</div>
			</dl>

			{seo.tags.length ? (
				<ul aria-label="Dashboard tags" className="flex flex-wrap gap-1.5">
					{seo.tags.map((tag) => (
						<li key={tag} className="rounded-md border border-(--cards-border) px-2 py-1 text-xs text-(--text-form)">
							{tag}
						</li>
					))}
				</ul>
			) : null}

			<div className="flex flex-col gap-2">
				<h2 className="text-sm font-semibold text-(--text-primary)">Dashboard contents</h2>
				{visibleSummaries.length ? (
					<ul className="grid gap-2 text-sm md:grid-cols-2">
						{visibleSummaries.map((item) => (
							<li key={item.id} className="rounded-md border border-(--cards-border) px-3 py-2 text-(--text-form)">
								{item.href ? (
									<BasicLink href={item.href} className="text-(--link-text) hover:underline">
										{item.label}
									</BasicLink>
								) : (
									item.label
								)}
							</li>
						))}
						{remainingItems > 0 ? (
							<li className="rounded-md border border-dashed border-(--cards-border) px-3 py-2 text-(--text-label)">
								+{remainingItems} more items in this dashboard
							</li>
						) : null}
					</ul>
				) : (
					<p className="text-sm text-(--text-label)">This public dashboard does not have any items yet.</p>
				)}
			</div>
		</section>
	)
}
