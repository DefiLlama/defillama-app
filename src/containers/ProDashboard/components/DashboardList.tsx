import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { Dashboard } from '../services/DashboardAPI'
import { DashboardCard } from './DashboardCard'
import { LoadingSpinner } from './LoadingSpinner'

interface DashboardListProps {
	dashboards: Dashboard[]
	isLoading: boolean
	onCreateNew: () => void
	onDeleteDashboard?: (dashboardId: string) => void
}

export function DashboardList({ dashboards, isLoading, onCreateNew, onDeleteDashboard }: DashboardListProps) {
	const [deletingId, setDeletingId] = useState<string | null>(null)

	const handleDelete = async (dashboardId: string, e: React.MouseEvent) => {
		e.stopPropagation()
		if (!onDeleteDashboard) return

		setDeletingId(dashboardId)
		try {
			onDeleteDashboard(dashboardId)
		} finally {
			setDeletingId(null)
		}
	}

	if (isLoading) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
				<LoadingSpinner />
			</div>
		)
	}

	return (
		<>
			{dashboards.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
					<Icon name="layers" height={48} width={48} className="text-(--text-label)" />
					<h2 className="text-center text-2xl font-bold">No dashboards yet</h2>
					<p className="text-center text-(--text-label)">Create your first dashboard to get started</p>
					<button
						onClick={onCreateNew}
						className="pro-btn-purple mt-7 flex items-center gap-1 rounded-md px-6 py-3 font-medium"
					>
						<Icon name="plus" height={16} width={16} />
						Create Dashboard
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
					{dashboards.map((dashboard) => (
						<DashboardCard
							key={dashboard.id}
							dashboard={dashboard}
							onDelete={onDeleteDashboard ? handleDelete : undefined}
							isDeleting={deletingId === dashboard.id}
							viewMode="grid"
						/>
					))}
				</div>
			)}
		</>
	)
}
