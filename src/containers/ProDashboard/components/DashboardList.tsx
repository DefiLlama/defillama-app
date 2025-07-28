import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from './LoadingSpinner'
import { Dashboard } from '../services/DashboardAPI'
import { DashboardCard } from './DashboardCard'

interface DashboardListProps {
	dashboards: Dashboard[]
	isLoading: boolean
	onSelectDashboard: (dashboardId: string) => void
	onCreateNew: () => void
	onDeleteDashboard?: (dashboardId: string) => void
}

export function DashboardList({
	dashboards,
	isLoading,
	onSelectDashboard,
	onCreateNew,
	onDeleteDashboard
}: DashboardListProps) {
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
			<div className="flex justify-center items-center h-40">
				<LoadingSpinner />
			</div>
		)
	}

	return (
		<div>
			{dashboards.length === 0 ? (
				<div className="text-center py-12">
					<div className="mb-4">
						<Icon name="layers" height={48} width={48} className="text-(--text3) mx-auto" />
					</div>
					<h3 className="text-lg font-medium text-(--text1) mb-2">No dashboards yet</h3>
					<p className="text-(--text3) mb-4">Create your first dashboard to get started</p>
					<button
						onClick={onCreateNew}
						className="px-4 py-2 bg-(--primary1) text-white flex items-center gap-2 hover:bg-(--primary1-hover) mx-auto"
					>
						<Icon name="plus" height={16} width={16} />
						Create Dashboard
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{dashboards.map((dashboard) => (
						<DashboardCard
							key={dashboard.id}
							dashboard={dashboard}
							onClick={() => onSelectDashboard(dashboard.id)}
							onDelete={onDeleteDashboard ? handleDelete : undefined}
							isDeleting={deletingId === dashboard.id}
							viewMode="grid"
						/>
					))}
				</div>
			)}
		</div>
	)
}
