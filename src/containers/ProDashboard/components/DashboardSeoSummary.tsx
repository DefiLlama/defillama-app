import { BasicLink } from '~/components/Link'
import type { DashboardSeo, DashboardSeoPublicDashboard } from '../utils/seo'

const COUNT_FORMATTER = new Intl.NumberFormat('en-US')

function formatDate(value: string | null): string | null {
	if (!value) return null
	const time = Date.parse(value)
	if (!Number.isFinite(time)) return null
	return new Date(time).toISOString().slice(0, 10)
}

function formatCount(value: number | undefined): string {
	return COUNT_FORMATTER.format(value ?? 0)
}

function AuthorAvatar({
	author,
	className = 'size-6'
}: {
	author: NonNullable<DashboardSeoPublicDashboard['author']>
	className?: string
}) {
	if (author.avatarUrl) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img src={author.avatarUrl} alt="" className={`${className} rounded-full object-cover`} />
		)
	}
	return (
		<span className={`${className} flex items-center justify-center rounded-full bg-(--link-button) text-sm`}>🦙</span>
	)
}

export function DashboardSeoSummary({ dashboard, seo }: { dashboard: DashboardSeoPublicDashboard; seo: DashboardSeo }) {
	const updatedDate = formatDate(seo.updated)
	const visibleSummaries = seo.itemSummaries.slice(0, 12)
	const remainingItems = Math.max(0, seo.itemCount - visibleSummaries.length)
	const metrics = [
		{ label: 'Items', value: formatCount(seo.itemCount) },
		{
			label: 'Updated',
			value: updatedDate ? <time dateTime={updatedDate}>{updatedDate}</time> : 'Unknown'
		},
		{ label: 'Views', value: formatCount(dashboard.viewCount) },
		{ label: 'Likes', value: formatCount(dashboard.likeCount) }
	]

	return (
		<section
			aria-labelledby="dashboard-title"
			className="isolate overflow-hidden rounded-md border pro-dashboard border-(--cards-border) bg-(--cards-bg)"
		>
			<div className="grid gap-5 px-4 py-4 md:px-5 md:py-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] xl:items-start">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
						<h1
							id="dashboard-title"
							className="text-[clamp(1.375rem,1.1rem+0.7vw,2rem)] leading-tight font-semibold text-(--text-primary)"
						>
							{dashboard.data.dashboardName || 'Untitled Dashboard'}
						</h1>
						<p className="inline-flex items-center gap-1.5 rounded-md border border-pro-green-400/20 bg-pro-green-100 px-2 py-1 text-xs font-medium text-pro-green-400 dark:bg-pro-green-300/12 dark:text-pro-green-200">
							<span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
							Public
						</p>
					</div>
					{dashboard.author ? (
						<BasicLink
							href={`/authors/${dashboard.author.slug}`}
							className="mt-3 inline-flex items-center gap-2 text-sm text-(--text-secondary) hover:text-(--link-text)"
						>
							<AuthorAvatar author={dashboard.author} />
							<span>
								By <span className="font-medium">{dashboard.author.displayName}</span>
							</span>
						</BasicLink>
					) : null}
					<p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-form)">{seo.description}</p>

					{seo.tags.length ? (
						<ul aria-label="Dashboard tags" className="mt-4 flex flex-wrap gap-1.5">
							{seo.tags.map((tag) => (
								<li
									key={tag}
									className="rounded-md border border-(--cards-border) bg-(--bg-secondary)/50 px-2 py-1 text-xs text-(--text-label)"
								>
									{tag}
								</li>
							))}
						</ul>
					) : null}
				</div>

				<dl className="grid grid-cols-2 overflow-hidden rounded-md border border-(--cards-border) bg-(--bg-secondary)/45 text-sm sm:grid-cols-4 xl:grid-cols-2">
					{metrics.map((metric, index) => (
						<div
							key={metric.label}
							className={`px-3 py-3 ${index % 2 === 1 ? 'border-l border-(--cards-border)' : ''} ${index > 1 ? 'border-t border-(--cards-border)' : ''} sm:border-t-0 sm:border-l sm:first:border-l-0 xl:[&:nth-child(3)]:border-l-0 xl:[&:nth-child(n+3)]:border-t`}
						>
							<dt className="text-[11px] leading-4 font-medium tracking-wide text-(--text-label) uppercase">
								{metric.label}
							</dt>
							<dd className="mt-1 text-base leading-5 font-semibold text-(--text-primary) tabular-nums">
								{metric.value}
							</dd>
						</div>
					))}
				</dl>
			</div>

			<div className="border-t border-(--cards-border) px-4 py-4 md:px-5">
				<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
					<h2 className="text-sm font-semibold text-(--text-primary)">Dashboard contents</h2>
					<p className="text-xs text-(--text-label)">
						{formatCount(seo.itemCount)} {seo.itemCount === 1 ? 'item' : 'items'}
					</p>
				</div>
				{visibleSummaries.length ? (
					<ul className="grid gap-x-7 text-sm md:grid-cols-2">
						{visibleSummaries.map((item, index) => (
							<li
								key={item.id}
								className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 border-t border-(--cards-border) py-2.5 first:border-t-0 md:[&:nth-child(2)]:border-t-0"
							>
								<span className="pt-0.5 text-xs font-medium text-(--text-label) tabular-nums">
									{String(index + 1).padStart(2, '0')}
								</span>
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
							<li className="border-t border-dashed border-(--cards-border) py-2.5 text-(--text-label)">
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
