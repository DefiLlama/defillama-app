import { Icon } from '~/components/Icon'
import { useLikedDashboards } from '../hooks/useLikedDashboards'
import { DashboardCard } from './DashboardCard'
import { LoadingSpinner } from './LoadingSpinner'

export function LikedDashboards() {
	const { dashboards, isLoading, page, totalPages, goToPage } = useLikedDashboards()

	if (isLoading) {
		return (
			<div className="flex h-40 items-center justify-center">
				<LoadingSpinner />
			</div>
		)
	}

	if (dashboards.length === 0) {
		return (
			<div className="py-12 text-center">
				<div className="mb-4">
					<Icon name="star" height={48} width={48} className="mx-auto text-(--text-tertiary)" />
				</div>
				<h3 className="mb-2 text-lg font-medium text-(--text-primary)">No favorite dashboards yet</h3>
				<p className="text-(--text-tertiary)">
					Dashboards you mark as favorites will appear here. Start exploring dashboards from the Discover tab!
				</p>
			</div>
		)
	}

	return (
		<div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
				{dashboards.map((dashboard) => (
					<DashboardCard key={dashboard.id} dashboard={dashboard} viewMode="grid" />
				))}
			</div>

			{totalPages > 1 && (
				<div className="mt-8 flex items-center justify-center gap-2">
					<button
						onClick={() => goToPage(Math.max(1, page - 1))}
						disabled={page === 1}
						className={`px-3 py-1 ${page === 1 ? 'pro-text3 cursor-not-allowed' : 'pro-text1 hover:bg-(--bg-glass)'}`}
					>
						<Icon name="chevron-left" height={16} width={16} />
					</button>

					{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						let pageNum = i + 1
						if (totalPages > 5) {
							if (page > 3) {
								pageNum = page - 2 + i
								if (pageNum > totalPages) {
									pageNum = totalPages - 4 + i
								}
							}
						}
						return (
							<button
								key={pageNum}
								onClick={() => goToPage(pageNum)}
								className={`px-3 py-1 ${
									page === pageNum ? 'bg-(--primary) text-white' : 'pro-text1 hover:bg-(--bg-glass)'
								}`}
							>
								{pageNum}
							</button>
						)
					})}

					<button
						onClick={() => goToPage(Math.min(totalPages, page + 1))}
						disabled={page === totalPages}
						className={`px-3 py-1 ${
							page === totalPages ? 'pro-text3 cursor-not-allowed' : 'pro-text1 hover:bg-(--bg-glass)'
						}`}
					>
						<Icon name="chevron-right" height={16} width={16} />
					</button>
				</div>
			)}
		</div>
	)
}
