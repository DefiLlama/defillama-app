import { Icon } from '~/components/Icon'
import { Dashboard } from '../services/DashboardAPI'
import { DashboardItemConfig } from '../types'
import { LoadingSpinner } from './LoadingSpinner'

interface DashboardCardProps {
	dashboard: Dashboard
	onClick: () => void
	onTagClick?: (tag: string) => void
	onDelete?: (dashboardId: string, e: React.MouseEvent) => void
	isDeleting?: boolean
	viewMode?: 'grid' | 'list'
}

export function DashboardCard({
	dashboard,
	onClick,
	onTagClick,
	onDelete,
	isDeleting,
	viewMode = 'grid'
}: DashboardCardProps) {
	const handleTagClick = (e: React.MouseEvent, tag: string) => {
		e.stopPropagation()
		onTagClick?.(tag)
	}

	const getItemTypeCount = () => {
		const counts: Record<string, number> = {}
		dashboard.data.items?.forEach((item: DashboardItemConfig) => {
			if (!item || typeof item !== 'object') {
				return
			}

			switch (item.kind) {
				case 'chart':
					counts['charts'] = (counts['charts'] || 0) + 1
					break
				case 'multi':
					counts['multi-charts'] = (counts['multi-charts'] || 0) + 1
					break
				case 'table':
					counts['tables'] = (counts['tables'] || 0) + 1
					break
				case 'text':
					counts['text blocks'] = (counts['text blocks'] || 0) + 1
					break
				default:
					const otherItem = item as DashboardItemConfig
					counts[otherItem.kind] = (counts[otherItem.kind] || 0) + 1
			}
		})

		const sorted = Object.entries(counts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)

		const summary = sorted.map(([type, count]) => `${count} ${type}`).join(', ')

		if (Object.keys(counts).length > 3) {
			const remaining = Object.keys(counts).length - 3
			return `${summary} +${remaining} more`
		}

		return summary
	}

	if (viewMode === 'list') {
		return (
			<div
				onClick={onClick}
				className="pro-glass hover:bg-opacity-40 flex cursor-pointer items-center justify-between gap-4 p-4 transition-all hover:bg-(--bg-glass)"
			>
				<div className="min-w-0 flex-1">
					<div className="mb-2 flex items-center gap-3">
						<h3 className="pro-text1 truncate text-lg font-medium">
							{dashboard.data.dashboardName || 'Untitled Dashboard'}
						</h3>
						{dashboard.visibility === 'public' ? (
							<span title="Public dashboard">
								<Icon name="earth" height={16} width={16} className="pro-text3" />
							</span>
						) : (
							<span title="Private dashboard">
								<Icon name="key" height={16} width={16} className="pro-text3" />
							</span>
						)}
					</div>

					{dashboard.description && <p className="pro-text3 mb-2 line-clamp-2 text-sm">{dashboard.description}</p>}

					<div className="pro-text3 flex items-center gap-4 text-sm">
						<span>{getItemTypeCount()}</span>
						<span>•</span>
						<span>Updated {new Date(dashboard.updated).toLocaleDateString()}</span>
					</div>
				</div>
				<div className="flex items-center gap-6">
					{dashboard.tags && dashboard.tags.length > 0 && (
						<div className="hidden max-w-xs flex-wrap gap-1 lg:flex">
							{dashboard.tags.slice(0, 3).map((tag) => (
								<button
									key={tag}
									onClick={(e) => handleTagClick(e, tag)}
									className="bg-opacity-50 pro-text2 pro-border border bg-(--bg-main) px-2 py-1 text-xs hover:border-(--divider)"
								>
									{tag}
								</button>
							))}
							{dashboard.tags.length > 3 && (
								<span className="pro-text3 px-2 py-1 text-xs">+{dashboard.tags.length - 3}</span>
							)}
						</div>
					)}

					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-1" title="Views">
							<Icon name="eye" height={16} width={16} className="pro-text3" />
							<span className="pro-text2">{dashboard.viewCount || 0}</span>
						</div>
						<div className="flex items-center gap-1" title="Likes">
							<Icon name="star" height={16} width={16} className="pro-text3" />
							<span className="pro-text2">{dashboard.likeCount || 0}</span>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			onClick={onClick}
			className="pro-glass hover:bg-opacity-40 group flex h-full cursor-pointer flex-col p-4 transition-all hover:bg-(--bg-glass)"
		>
			<div className="mb-3 flex items-start justify-between">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<h3 className="pro-text1 truncate text-lg font-medium">
						{dashboard.data.dashboardName || 'Untitled Dashboard'}
					</h3>
					{dashboard.visibility === 'public' ? (
						<span title="Public dashboard" className="shrink-0">
							<Icon name="earth" height={16} width={16} className="pro-text3" />
						</span>
					) : (
						<span title="Private dashboard" className="shrink-0">
							<Icon name="key" height={16} width={16} className="pro-text3" />
						</span>
					)}
				</div>
				{onDelete && (
					<button
						onClick={(e) => onDelete(dashboard.id, e)}
						disabled={isDeleting}
						className="shrink-0 p-1 text-(--text-tertiary) opacity-0 transition-all group-hover:opacity-100 hover:text-red-500"
						title="Delete dashboard"
					>
						{isDeleting ? (
							<div className="h-4 w-4">
								<LoadingSpinner />
							</div>
						) : (
							<Icon name="trash-2" height={16} width={16} />
						)}
					</button>
				)}
			</div>

			{dashboard.description && <p className="pro-text3 mb-3 line-clamp-2 text-sm">{dashboard.description}</p>}

			<div className="pro-text3 flex-1 space-y-2 text-sm">
				<div className="flex items-center gap-2">
					<Icon name="layers" height={14} width={14} />
					<span>{dashboard.data.items?.length || 0} items</span>
				</div>

				{dashboard.data.items && dashboard.data.items.length > 0 && (
					<div className="pro-text2 bg-opacity-30 inline-block rounded bg-(--bg-glass) px-2 py-1 text-xs">
						{getItemTypeCount()}
					</div>
				)}

				<div className="flex items-center gap-2">
					<Icon name="clock" height={14} width={14} />
					<span>Updated {new Date(dashboard.updated).toLocaleDateString()}</span>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-between border-t border-(--divider) pt-4">
				<div className="flex items-center gap-3 text-sm">
					<div className="flex items-center gap-1" title="Views">
						<Icon name="eye" height={16} width={16} className="pro-text3" />
						<span className="pro-text2">{dashboard.viewCount || 0}</span>
					</div>
					<div className="flex items-center gap-1" title="Likes">
						<Icon name="star" height={16} width={16} className="pro-text3" />
						<span className="pro-text2">{dashboard.likeCount || 0}</span>
					</div>
				</div>

				{dashboard.tags && dashboard.tags.length > 0 && (
					<div className="flex max-w-[60%] flex-wrap gap-1">
						{dashboard.tags.slice(0, 2).map((tag) => (
							<button
								key={tag}
								onClick={(e) => handleTagClick(e, tag)}
								className="bg-opacity-50 pro-text2 pro-border border bg-(--bg-main) px-2 py-1 text-xs hover:border-(--divider)"
							>
								{tag}
							</button>
						))}
						{dashboard.tags.length > 2 && (
							<span className="pro-text3 px-2 py-1 text-xs">+{dashboard.tags.length - 2}</span>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
