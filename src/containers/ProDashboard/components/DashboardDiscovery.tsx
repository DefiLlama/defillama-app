import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useDashboardDiscovery } from '../hooks/useDashboardDiscovery'
import { DashboardCard } from './DashboardCard'
import { DashboardSearch } from './DashboardSearch'
import { LoadingSpinner } from './LoadingSpinner'

type SortOption = 'popular' | 'recent' | 'likes'

const viewModes = ['grid', 'list'] as const
type ViewMode = (typeof viewModes)[number]

function getUrl({
	base,
	key,
	value,
	replace = false
}: {
	base: string
	key: string
	value: string | undefined
	replace?: boolean
}) {
	if (typeof window === 'undefined') {
		return `${base}?${new URLSearchParams({ [key]: value }).toString()}`
	}

	const params = new URLSearchParams(window.location.search)

	if (value === '' || value == null) {
		params.delete(key)
	} else {
		if (replace) {
			// Replace: remove all existing values and set new one
			params.delete(key)
			params.append(key, value)
		} else {
			const existingValues = params.getAll(key)

			if (existingValues.includes(value)) {
				// Remove all instances of this key
				params.delete(key)

				// Re-add all values except the one to remove
				existingValues.filter((oldValue) => oldValue !== value).forEach((value) => params.append(key, value))
			} else {
				// Append: add new value to existing ones
				params.append(key, value)
			}
		}
	}

	return `${base}?${params.toString()}`
}

export function DashboardDiscovery() {
	const router = useRouter()

	const { viewMode, selectedTags, selectedTagsWithUrl } = useMemo(() => {
		const { view, tag } = router.query

		const viewMode = typeof view === 'string' && viewModes.includes(view as ViewMode) ? (view as ViewMode) : 'grid'
		const selectedTags = tag ? (typeof tag === 'string' ? [tag] : tag) : []

		const selectedTagsWithUrl = selectedTags.map((tag) => ({
			tag,
			url: getUrl({ base: '/pro', key: 'tag', value: tag })
		}))

		return { viewMode, selectedTags, selectedTagsWithUrl }
	}, [router.query])

	const [sortBy, setSortBy] = useState<SortOption>('popular')
	const [searchQuery, setSearchQuery] = useState('')
	const [page, setPage] = useState(1)

	const { dashboards, isLoading, totalPages, totalItems, searchDashboards, discoverDashboards } =
		useDashboardDiscovery()

	useEffect(() => {
		if (searchQuery || selectedTags.length > 0) {
			searchDashboards({
				query: searchQuery,
				tags: selectedTags,
				visibility: 'public',
				sortBy,
				page,
				limit: 20
			})
		} else {
			discoverDashboards({ page, limit: 20, sortBy })
		}
	}, [searchQuery, selectedTags, sortBy, page])

	const handleTagClick = (tag: string) => {
		router.push(getUrl({ base: '/pro', key: 'tag', value: tag }), undefined, { shallow: true })
		setPage(1)
	}

	return (
		<>
			<div className="flex flex-col gap-1">
				<h1>Explore public dashboards created by the community</h1>

				<div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
					<DashboardSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

					<div className="flex items-center gap-4">
						<label className="flex items-center gap-2">
							<span className="text-(--text-label)">Sort by:</span>
							<select
								value={sortBy}
								onChange={(e) => {
									setSortBy(e.target.value as SortOption)
									setPage(1)
								}}
								className="h-[32px] rounded-md border border-(--form-control-border) px-2 py-1.5 focus:border-(--primary) focus:outline-hidden"
							>
								<option value="popular">Most Popular</option>
								<option value="recent">Recently Created</option>
								<option value="likes">Most Liked</option>
							</select>
						</label>

						<div className="flex items-center rounded-md border border-(--form-control-border)">
							<BasicLink
								href={getUrl({ base: '/pro', key: 'view', value: 'grid', replace: true })}
								shallow
								data-active={viewMode === 'grid'}
								className="rounded-l-md border-r border-(--form-control-border) p-2 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							>
								<Icon name="layers" height={16} width={16} />
								<span className="sr-only">View as grid</span>
							</BasicLink>
							<BasicLink
								href={getUrl({ base: '/pro', key: 'view', value: 'list', replace: true })}
								shallow
								data-active={viewMode === 'list'}
								className="rounded-r-md border-(--form-control-border) p-2 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							>
								<Icon name="align-left" height={16} width={16} />
								<span className="sr-only">View as list</span>
							</BasicLink>
						</div>
					</div>
				</div>

				{selectedTagsWithUrl.length > 0 && (
					<div className="mt-1 flex items-center gap-2 text-xs">
						<h2>Active filters:</h2>
						<div className="flex flex-wrap gap-2">
							{selectedTagsWithUrl.map(({ tag, url }) => (
								<BasicLink
									key={`pro-dashboard-tag-${tag}-${url}`}
									href={url}
									shallow
									className="flex items-center gap-1 rounded-full border border-(--switch-border) px-2 py-1 text-xs hover:border-transparent hover:bg-(--link-active-bg) hover:text-white"
								>
									<span className="sr-only">Remove</span>
									<span>{tag}</span>
									<Icon name="x" height={12} width={12} />
								</BasicLink>
							))}
						</div>
						<BasicLink
							href={getUrl({ base: '/pro', key: 'tag', value: '', replace: true })}
							shallow
							className="text-(--text-label) hover:text-(--error)"
						>
							Clear all
						</BasicLink>
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
					<LoadingSpinner />
				</div>
			) : dashboards.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
					<Icon name="search" height={48} width={48} className="text-(--text-label)" />
					<h1 className="text-center text-2xl font-bold">No dashboards found</h1>
					<p className="text-center text-(--text-label)">
						{searchQuery || selectedTags.length > 0
							? 'Try adjusting your search criteria'
							: 'Be the first to share a public dashboard!'}
					</p>
				</div>
			) : (
				<>
					<p className="-mb-2 text-xs text-(--text-label)">
						Showing {dashboards.length} of {totalItems} dashboards
					</p>

					<div
						className={
							viewMode === 'grid' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'space-y-4'
						}
					>
						{dashboards.map((dashboard) => (
							<DashboardCard key={dashboard.id} dashboard={dashboard} onTagClick={handleTagClick} viewMode={viewMode} />
						))}
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:opacity-0"
							>
								<Icon name="chevron-left" height={16} width={16} />
							</button>

							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const pageNum = i + 1
								return (
									<button
										key={pageNum}
										onClick={() => setPage(pageNum)}
										data-active={page === pageNum}
										className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										{pageNum}
									</button>
								)
							})}

							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
								className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:opacity-0"
							>
								<Icon name="chevron-right" height={16} width={16} />
							</button>
						</div>
					)}
				</>
			)}
		</>
	)
}
