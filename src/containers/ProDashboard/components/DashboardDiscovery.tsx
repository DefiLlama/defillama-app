import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select'
import { useDashboardDiscovery } from '../hooks/useDashboardDiscovery'
import { DashboardCard } from './DashboardCard'
import { DashboardSearch } from './DashboardSearch'
import { LoadingSpinner } from './LoadingSpinner'

const viewModes = ['grid', 'list'] as const
type ViewMode = (typeof viewModes)[number]
const sortOptions = [
	{ key: 'popular', name: 'Most Popular' },
	{ key: 'recent', name: 'Recently Created' },
	{ key: 'likes', name: 'Most Liked' }
] as const
type SortOption = (typeof sortOptions)[number]

export function DashboardDiscovery() {
	const router = useRouter()

	const [searchQuery, setSearchQuery] = useState('')
	const [page, setPage] = useState(1)

	const { viewMode, selectedTags, selectedSortBy } = useMemo(() => {
		const { view, tag, sortBy } = router.query

		const viewMode = typeof view === 'string' && viewModes.includes(view as ViewMode) ? (view as ViewMode) : 'grid'
		const selectedTags = tag ? (typeof tag === 'string' ? [tag] : tag) : []
		const selectedSortBy =
			typeof sortBy === 'string'
				? (sortOptions.find((option) => option.key === sortBy) ?? sortOptions[0])
				: sortOptions[0]

		return { viewMode, selectedTags, selectedSortBy }
	}, [router.query])

	const { dashboards, isLoading, totalPages, totalItems, searchDashboards, discoverDashboards } =
		useDashboardDiscovery()

	useEffect(() => {
		if (searchQuery || selectedTags.length > 0) {
			searchDashboards({
				query: searchQuery,
				tags: selectedTags,
				visibility: 'public',
				sortBy: selectedSortBy.key,
				page,
				limit: 20
			})
		} else {
			discoverDashboards({ page, limit: 20, sortBy: selectedSortBy.key })
		}
	}, [searchQuery, selectedTags, selectedSortBy, page])

	const handleTagClick = (tag: string) => {
		if (router.query.tag && router.query.tag.includes(tag)) {
			return
		}

		router.push(
			{
				pathname: '/pro',
				query: {
					...router.query,
					tag: tag
				}
			},
			undefined,
			{ shallow: true }
		)
		setPage(1)
	}

	return (
		<>
			<div className="flex flex-col gap-1">
				<h1>Explore public dashboards created by the community</h1>

				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<DashboardSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

					<div className="ml-auto flex flex-wrap items-center gap-4">
						<Select
							allValues={sortOptions}
							selectedValues={selectedSortBy.key}
							setSelectedValues={(value) => {
								router.push(
									{
										pathname: '/pro',
										query: { ...router.query, sortBy: value as SortOption['key'] }
									},
									undefined,
									{ shallow: true }
								)
							}}
							label={
								<>
									<span className="text-(--text-label)">Sort by:</span>
									<span className="overflow-hidden text-ellipsis whitespace-nowrap">{selectedSortBy.name}</span>
								</>
							}
							labelType="none"
							triggerProps={{
								className:
									'rounded-md flex items-center gap-1 text-black dark:text-white flex items-center justify-between rounded-md border border-(--form-control-border) px-2 py-1.5'
							}}
							aria-label="Sort by"
						/>

						<div className="flex items-center rounded-md border border-(--form-control-border)">
							<button
								onClick={() => {
									router.push(
										{
											pathname: '/pro',
											query: {
												...router.query,
												view: 'grid'
											}
										},
										undefined,
										{
											shallow: true
										}
									)
								}}
								data-active={viewMode === 'grid'}
								className="rounded-l-md border-r border-(--form-control-border) p-2 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							>
								<Icon name="layers" height={16} width={16} />
								<span className="sr-only">View as grid</span>
							</button>
							<button
								onClick={() => {
									router.push(
										{
											pathname: '/pro',
											query: {
												...router.query,
												view: 'list'
											}
										},
										undefined,
										{
											shallow: true
										}
									)
								}}
								data-active={viewMode === 'list'}
								className="rounded-r-md border-(--form-control-border) p-2 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							>
								<Icon name="align-left" height={16} width={16} />
								<span className="sr-only">View as list</span>
							</button>
						</div>
					</div>
				</div>

				{selectedTags.length > 0 && (
					<div className="mt-1 flex items-center gap-2 text-xs">
						<h2>Active filters:</h2>
						<div className="flex flex-wrap gap-2">
							{selectedTags.map((tag) => (
								<button
									key={`pro-dashboard-tag-${tag}`}
									onClick={() => {
										const { tag: currentTag, ...query } = router.query
										const newQuery = query
										if (currentTag && currentTag.includes(tag)) {
											// If the tag is an array, filter it to remove the tag
											if (Array.isArray(currentTag)) {
												newQuery.tag = currentTag.filter((t) => t !== tag)
											} else {
												// If the tag is a string, completely remove the key
												delete newQuery.tag
											}
										}

										router.push(
											{
												pathname: '/pro',
												query: newQuery
											},
											undefined,
											{ shallow: true }
										)
									}}
									className="flex items-center gap-1 rounded-full border border-(--switch-border) px-2 py-1 text-xs hover:border-transparent hover:bg-(--link-active-bg) hover:text-white"
								>
									<span className="sr-only">Remove</span>
									<span>{tag}</span>
									<Icon name="x" height={12} width={12} />
								</button>
							))}
						</div>
						<button
							onClick={() => {
								const { tag, ...query } = router.query

								// Clear all tags
								router.push(
									{
										pathname: '/pro',
										query
									},
									undefined,
									{
										shallow: true
									}
								)
							}}
							className="text-(--text-label) hover:text-(--error)"
						>
							Clear all
						</button>
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

							{Array.from({ length: Math.min(MAX_PAGES, totalPages) }, (_, i) => {
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
								disabled={page === MAX_PAGES}
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

const MAX_PAGES = 5
