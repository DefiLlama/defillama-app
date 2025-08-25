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
			<div className="flex h-40 items-center justify-center">
				<LoadingSpinner />
			</div>
		)
	}

	return (
		<div>
			{dashboards.length === 0 ? (
				<div className="py-12 text-center">
					<div className="mb-4">
						<Icon name="layers" height={48} width={48} className="mx-auto text-(--text-tertiary)" />
					</div>
					<h3 className="mb-2 text-lg font-medium text-(--text-primary)">No dashboards yet</h3>
					<p className="mb-4 text-(--text-tertiary)">Create your first dashboard to get started</p>
					<button
						onClick={onCreateNew}
						className="mx-auto flex items-center gap-2 bg-(--primary) px-4 py-2 text-white hover:bg-(--primary-hover)"
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
		</div>
	)
}
