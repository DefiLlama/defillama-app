import { Icon } from '~/components/Icon'
import { Dashboard } from '../services/DashboardAPI'
import { LoadingSpinner } from './LoadingSpinner'
import { DashboardItemConfig } from '../types'

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
				className="pro-glass hover:bg-(--bg-glass) hover:bg-opacity-40 cursor-pointer transition-all p-4 flex items-center justify-between gap-4"
			>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-3 mb-2">
						<h3 className="font-medium text-lg pro-text1 truncate">
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

					{dashboard.description && <p className="pro-text3 text-sm mb-2 line-clamp-2">{dashboard.description}</p>}

					<div className="flex items-center gap-4 text-sm pro-text3">
						<span>{getItemTypeCount()}</span>
						<span>•</span>
						<span>Updated {new Date(dashboard.updated).toLocaleDateString()}</span>
					</div>
				</div>
				<div className="flex items-center gap-6">
					{dashboard.tags && dashboard.tags.length > 0 && (
						<div className="hidden lg:flex flex-wrap gap-1 max-w-xs">
							{dashboard.tags.slice(0, 3).map((tag) => (
								<button
									key={tag}
									onClick={(e) => handleTagClick(e, tag)}
									className="px-2 py-1 bg-(--bg-main) bg-opacity-50 text-xs pro-text2 border pro-border hover:border-(--divider)"
								>
									{tag}
								</button>
							))}
							{dashboard.tags.length > 3 && (
								<span className="px-2 py-1 text-xs pro-text3">+{dashboard.tags.length - 3}</span>
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
			className="pro-glass hover:bg-(--bg-glass) hover:bg-opacity-40 cursor-pointer transition-all p-4 group h-full flex flex-col"
		>
			<div className="flex items-start justify-between mb-3">
				<div className="flex-1 min-w-0 flex items-center gap-2">
					<h3 className="font-medium text-lg pro-text1 truncate">
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
						className="opacity-0 group-hover:opacity-100 text-(--text-tertiary) hover:text-red-500 transition-all p-1 shrink-0"
						title="Delete dashboard"
					>
						{isDeleting ? (
							<div className="w-4 h-4">
								<LoadingSpinner />
							</div>
						) : (
							<Icon name="trash-2" height={16} width={16} />
						)}
					</button>
				)}
			</div>

			{dashboard.description && <p className="pro-text3 text-sm mb-3 line-clamp-2">{dashboard.description}</p>}

			<div className="flex-1 space-y-2 text-sm pro-text3">
				<div className="flex items-center gap-2">
					<Icon name="layers" height={14} width={14} />
					<span>{dashboard.data.items?.length || 0} items</span>
				</div>

				{dashboard.data.items && dashboard.data.items.length > 0 && (
					<div className="text-xs pro-text2 bg-(--bg-glass) bg-opacity-30 px-2 py-1 rounded inline-block">
						{getItemTypeCount()}
					</div>
				)}

				<div className="flex items-center gap-2">
					<Icon name="clock" height={14} width={14} />
					<span>Updated {new Date(dashboard.updated).toLocaleDateString()}</span>
				</div>
			</div>

			<div className="mt-4 pt-4 border-t border-(--divider) flex items-center justify-between">
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
					<div className="flex flex-wrap gap-1 max-w-[60%]">
						{dashboard.tags.slice(0, 2).map((tag) => (
							<button
								key={tag}
								onClick={(e) => handleTagClick(e, tag)}
								className="px-2 py-1 bg-(--bg-main) bg-opacity-50 text-xs pro-text2 border pro-border hover:border-(--divider)"
							>
								{tag}
							</button>
						))}
						{dashboard.tags.length > 2 && (
							<span className="px-2 py-1 text-xs pro-text3">+{dashboard.tags.length - 2}</span>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
