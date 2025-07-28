import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from './LoadingSpinner'
import { DashboardCard } from './DashboardCard'
import { DashboardSearch } from './DashboardSearch'
import { Dashboard } from '../services/DashboardAPI'
import { useDashboardDiscovery } from '../hooks/useDashboardDiscovery'
import { useAuthContext } from '~/containers/Subscribtion/auth'

type SortOption = 'popular' | 'recent' | 'likes'
type ViewMode = 'grid' | 'list'

export function DashboardDiscovery() {
	const router = useRouter()
	const [viewMode, setViewMode] = useState<ViewMode>('grid')
	const [sortBy, setSortBy] = useState<SortOption>('popular')
	const [selectedTags, setSelectedTags] = useState<string[]>([])
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
		setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
		setPage(1)
	}

	const handleDashboardClick = (dashboardId: string) => {
		router.push(`/pro/${dashboardId}`)
	}

	return (
		<div>
			<div className="mb-6">
				<p className="pro-text3 mb-4">Explore public dashboards created by the community</p>

				<div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
					<DashboardSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<label className="text-sm pro-text3">Sort by:</label>
							<select
								value={sortBy}
								onChange={(e) => {
									setSortBy(e.target.value as SortOption)
									setPage(1)
								}}
								className="px-3 py-1.5 bg-(--bg7) border pro-border pro-text1 focus:outline-hidden focus:border-(--primary1)"
							>
								<option value="popular">Most Popular</option>
								<option value="recent">Recently Created</option>
								<option value="likes">Most Liked</option>
							</select>
						</div>

						<div className="flex items-center border pro-border">
							<button
								onClick={() => setViewMode('grid')}
								className={`p-2 ${viewMode === 'grid' ? 'bg-(--primary1) text-white' : 'pro-text3 hover:pro-text1'}`}
								title="Grid view"
							>
								<Icon name="layers" height={16} width={16} />
							</button>
							<button
								onClick={() => setViewMode('list')}
								className={`p-2 ${viewMode === 'list' ? 'bg-(--primary1) text-white' : 'pro-text3 hover:pro-text1'}`}
								title="List view"
							>
								<Icon name="align-left" height={16} width={16} />
							</button>
						</div>
					</div>
				</div>

				{selectedTags.length > 0 && (
					<div className="mt-4 flex items-center gap-2">
						<span className="text-sm pro-text3">Active filters:</span>
						<div className="flex flex-wrap gap-2">
							{selectedTags.map((tag) => (
								<button
									key={tag}
									onClick={() => handleTagClick(tag)}
									className="px-3 py-1 bg-(--bg7) border pro-border pro-text1 text-sm flex items-center gap-1 hover:border-(--pro-glass-border)"
								>
									{tag}
									<Icon name="x" height={12} width={12} />
								</button>
							))}
						</div>
						<button
							onClick={() => {
								setSelectedTags([])
								setPage(1)
							}}
							className="text-sm pro-text3 hover:pro-text1"
						>
							Clear all
						</button>
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="flex justify-center items-center h-64">
					<LoadingSpinner />
				</div>
			) : dashboards.length === 0 ? (
				<div className="text-center py-12">
					<Icon name="search" height={48} width={48} className="pro-text3 mx-auto mb-4" />
					<h3 className="text-lg font-medium pro-text1 mb-2">No dashboards found</h3>
					<p className="pro-text3">
						{searchQuery || selectedTags.length > 0
							? 'Try adjusting your search criteria'
							: 'Be the first to share a public dashboard!'}
					</p>
				</div>
			) : (
				<>
					<div className="mb-4 pro-text3 text-sm">
						Showing {dashboards.length} of {totalItems} dashboards
					</div>

					<div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
						{dashboards.map((dashboard) => (
							<DashboardCard
								key={dashboard.id}
								dashboard={dashboard}
								onClick={() => handleDashboardClick(dashboard.id)}
								onTagClick={handleTagClick}
								viewMode={viewMode}
							/>
						))}
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2 mt-8">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className={`px-3 py-1 ${page === 1 ? 'pro-text3 cursor-not-allowed' : 'pro-text1 hover:bg-(--bg7)'}`}
							>
								<Icon name="chevron-left" height={16} width={16} />
							</button>

							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const pageNum = i + 1
								return (
									<button
										key={pageNum}
										onClick={() => setPage(pageNum)}
										className={`px-3 py-1 ${
											page === pageNum ? 'bg-(--primary1) text-white' : 'pro-text1 hover:bg-(--bg7)'
										}`}
									>
										{pageNum}
									</button>
								)
							})}

							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
								className={`px-3 py-1 ${
									page === totalPages ? 'pro-text3 cursor-not-allowed' : 'pro-text1 hover:bg-(--bg7)'
								}`}
							>
								<Icon name="chevron-right" height={16} width={16} />
							</button>
						</div>
					)}
				</>
			)}
		</div>
	)
}
