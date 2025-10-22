import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { LoadingSkeleton } from '~/components/LoadingSkeleton'
import { Select } from '~/components/Select'
import { useDashboardDiscovery } from '../hooks/useDashboardDiscovery'
import { DashboardCard } from './DashboardCard'
import { DashboardSearch } from './DashboardSearch'

const viewModes = ['grid', 'list'] as const
type ViewMode = (typeof viewModes)[number]
const PAGE_LIMIT = 20 as const
const sortOptions = [
	{ key: 'popular', name: 'Most Popular' },
	{ key: 'recent', name: 'Recently Created' },
	{ key: 'likes', name: 'Most Liked' }
] as const
type SortOption = (typeof sortOptions)[number]

export function DashboardDiscovery() {
	const router = useRouter()

	const { viewMode, selectedTags, selectedSortBy, searchQuery, selectedPage } = useMemo(() => {
		const { view, tag, sortBy, query, page } = router.query

		const viewMode = typeof view === 'string' && viewModes.includes(view as ViewMode) ? (view as ViewMode) : 'grid'
		const selectedTags = tag ? (typeof tag === 'string' ? [tag] : tag) : []
		const selectedSortBy =
			typeof sortBy === 'string'
				? (sortOptions.find((option) => option.key === sortBy) ?? sortOptions[0])
				: sortOptions[0]
		const searchQuery = typeof query === 'string' ? query : ''
		const selectedPage = typeof page === 'string' && !Number.isNaN(Number(page)) ? parseInt(page) : 1

		return { viewMode, selectedTags, selectedSortBy, searchQuery, selectedPage }
	}, [router.query])

	const { dashboards, isLoading, totalPages, totalItems } = useDashboardDiscovery({
		query: searchQuery,
		tags: selectedTags,
		visibility: 'public',
		sortBy: selectedSortBy.key,
		page: selectedPage,
		limit: PAGE_LIMIT
	})

	const handleTagClick = (tag: string) => {
		if (router.query.tag && router.query.tag.includes(tag)) {
			return
		}

		// remove page from query
		const { page, ...queryWithoutPage } = router.query

		router.push(
			{
				pathname: '/pro',
				query: {
					...queryWithoutPage,
					tag: tag
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const pagesToShow = useMemo(() => {
		if (selectedPage === 1) {
			return [1, 2, 3]
		}

		if (selectedPage === totalPages) {
			return [totalPages - 2, totalPages - 1, totalPages]
		}

		return [selectedPage - 1, selectedPage, selectedPage + 1]
	}, [totalPages, selectedPage])

	return (
		<>
			<div className="flex flex-col gap-1">
				<h1 className="text-wrap text-(--text-label)">Explore public dashboards created by the community</h1>

				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<DashboardSearch defaultValue={searchQuery} />

					<div className="ml-auto flex flex-wrap items-center gap-4">
						<Select
							allValues={sortOptions}
							selectedValues={selectedSortBy.key}
							setSelectedValues={(value) => {
								const { page, ...queryWithoutPage } = router.query
								router.push(
									{
										pathname: '/pro',
										query: { ...queryWithoutPage, sortBy: value as SortOption['key'] }
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
									'rounded-md flex items-center gap-1 flex items-center justify-between rounded-md border border-(--form-control-border) px-2 py-1.5'
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
						<h2 className="text-(--text-label)">Active filters:</h2>
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
				<>
					<p className="-mb-2 text-xs text-(--text-label)">Loading dashboards…</p>
					<LoadingSkeleton viewMode={viewMode} items={PAGE_LIMIT} />
				</>
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
						<div className="flex flex-col items-center gap-4">
							<p className="text-xs text-(--text-label)">
								Page {selectedPage} of {totalPages}
							</p>
							<div className="flex flex-nowrap items-center justify-center gap-2 overflow-x-auto">
								<button
									onClick={() => {
										const { page, ...query } = router.query
										router.push(
											{
												pathname: '/pro',
												query
											},
											undefined,
											{ shallow: true }
										)
									}}
									disabled={selectedPage < 3}
									className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
								>
									<Icon name="chevrons-left" height={16} width={16} />
								</button>
								<button
									onClick={() => {
										router.push(
											{
												pathname: '/pro',
												query: { ...router.query, page: Math.max(1, selectedPage - 1) }
											},
											undefined,
											{ shallow: true }
										)
									}}
									disabled={selectedPage === 1}
									className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
								>
									<Icon name="chevron-left" height={16} width={16} />
								</button>
								{pagesToShow.map((pageNum) => {
									const isActive = selectedPage === pageNum
									return (
										<button
											key={`page-to-navigate-to-${pageNum}`}
											onClick={() => {
												router.push(
													{
														pathname: '/pro',
														query: { ...router.query, page: pageNum }
													},
													undefined,
													{ shallow: true }
												)
											}}
											data-active={isActive}
											className="h-[32px] min-w-[32px] flex-shrink-0 rounded-md px-2 py-1.5 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
										>
											{pageNum}
										</button>
									)
								})}
								<button
									onClick={() => {
										router.push(
											{
												pathname: '/pro',
												query: { ...router.query, page: Math.min(totalPages, selectedPage + 1) }
											},
											undefined,
											{ shallow: true }
										)
									}}
									disabled={selectedPage === totalPages}
									className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
								>
									<Icon name="chevron-right" height={16} width={16} />
								</button>
								<button
									onClick={() => {
										router.push(
											{
												pathname: '/pro',
												query: { ...router.query, page: totalPages }
											},
											undefined,
											{ shallow: true }
										)
									}}
									disabled={selectedPage > totalPages - 2}
									className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
								>
									<Icon name="chevrons-right" height={16} width={16} />
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</>
	)
}
