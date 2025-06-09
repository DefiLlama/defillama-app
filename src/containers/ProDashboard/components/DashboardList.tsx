import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from './LoadingSpinner'
import { Dashboard } from '../services/DashboardAPI'
import { ChartConfig } from '../types'

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
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-[var(--text1)]">My Dashboards</h1>
				<button
					onClick={onCreateNew}
					className="px-4 py-2 bg-[var(--primary1)] text-white flex items-center gap-2 hover:bg-[var(--primary1-hover)]"
				>
					<Icon name="plus" height={16} width={16} />
					Create New Dashboard
				</button>
			</div>

			{dashboards.length === 0 ? (
				<div className="text-center py-12">
					<div className="mb-4">
						<Icon name="layers" height={48} width={48} className="text-[var(--text3)] mx-auto" />
					</div>
					<h3 className="text-lg font-medium text-[var(--text1)] mb-2">No dashboards yet</h3>
					<p className="text-[var(--text3)] mb-4">Create your first dashboard to get started</p>
					<button
						onClick={onCreateNew}
						className="px-4 py-2 bg-[var(--primary1)] text-white flex items-center gap-2 hover:bg-[var(--primary1-hover)] mx-auto"
					>
						<Icon name="plus" height={16} width={16} />
						Create Dashboard
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{dashboards.map((dashboard) => (
						<div
							key={dashboard.id}
							onClick={() => onSelectDashboard(dashboard.id)}
							className="bg-[var(--bg7)] bg-opacity-30 backdrop-filter backdrop-blur-xl border border-white/30 hover:border-white/40 hover:bg-[var(--bg7)] hover:bg-opacity-40 cursor-pointer transition-all p-4 group"
						>
							<div className="flex items-start justify-between mb-3">
								<h3 className="font-medium text-[var(--text1)] truncate pr-2">
									{dashboard.data.dashboardName || 'Untitled Dashboard'}
								</h3>
								{onDeleteDashboard && (
									<button
										onClick={(e) => handleDelete(dashboard.id, e)}
										disabled={deletingId === dashboard.id}
										className="opacity-0 group-hover:opacity-100 text-[var(--text3)] hover:text-red-500 transition-all p-1"
										title="Delete dashboard"
									>
										{deletingId === dashboard.id ? (
											<div className="w-4 h-4">
												<LoadingSpinner />
											</div>
										) : (
											<Icon name="trash-2" height={16} width={16} />
										)}
									</button>
								)}
							</div>
							
							<div className="space-y-2 text-sm text-[var(--text3)]">
								<div className="flex items-center gap-2">
									<Icon name="bar-chart-2" height={14} width={14} />
									<span>{dashboard.data.items?.length || 0} items</span>
								</div>
								
								<div className="flex items-center gap-2">
									<Icon name="calendar" height={14} width={14} />
									<span>Created {new Date(dashboard.created).toLocaleDateString()}</span>
								</div>
								
								<div className="flex items-center gap-2">
									<Icon name="clock" height={14} width={14} />
									<span>Updated {new Date(dashboard.updated).toLocaleDateString()}</span>
								</div>
							</div>

							{dashboard.data.items && dashboard.data.items.length > 0 && (
								<div className="mt-3 pt-3 border-t border-[var(--divider)]">
									<div className="text-xs text-[var(--text3)] mb-2">Items:</div>
									<div className="flex flex-wrap gap-1">
										{dashboard.data.items.slice(0, 3).map((item) => {
											const displayText = 
												item.kind === 'chart' ? `${(item as ChartConfig).type} chart` : 
												item.kind === 'table' ? 'table' :
												item.kind === 'multi' ? 'multi chart' :
												item.kind === 'text' ? 'text' : 'unknown';
											return (
												<span
													key={item.id}
													className="px-2 py-1 bg-[var(--bg1)] bg-opacity-50 text-xs text-[var(--text2)] border border-white/10 rounded"
												>
													{displayText}
												</span>
											);
										})}
										{dashboard.data.items.length > 3 && (
											<span className="px-2 py-1 text-xs text-[var(--text3)]">
												+{dashboard.data.items.length - 3} more
											</span>
										)}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}