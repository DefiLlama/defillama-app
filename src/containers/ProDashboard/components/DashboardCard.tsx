import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { Dashboard } from '../services/DashboardAPI'
import { DashboardItemConfig } from '../types'

interface DashboardCardProps {
	dashboard: Dashboard
	onTagClick?: (tag: string) => void
	onDelete?: (dashboardId: string) => void
	isDeleting?: boolean
	viewMode?: 'grid' | 'list'
	className?: string
}

export function DashboardCard({ dashboard, onTagClick, onDelete, viewMode = 'grid', className }: DashboardCardProps) {
	const [isDeleting, setIsDeleting] = useState<boolean>(false)
	const handleDelete = async (dashboardId: string, e: React.MouseEvent) => {
		e.stopPropagation()
		if (!onDelete) return
		setIsDeleting(true)
		try {
			await onDelete(dashboardId)
		} finally {
			setIsDeleting(false)
		}
	}

	const itemTypes = useMemo(() => {
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
	}, [dashboard.data.items])

	return (
		<div
			className={`hover:bg-pro-blue-300/5 dark:hover:bg-pro-blue-300/10 relative isolate flex ${viewMode === 'grid' ? 'min-h-[220px]' : ''} flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2.5 ${className ?? ''}`}
		>
			<div className="flex flex-wrap items-center justify-end gap-2">
				<h2 className="mr-auto text-lg font-medium text-wrap">
					{dashboard.data.dashboardName || 'Untitled Dashboard'}
				</h2>

				{viewMode !== 'grid' && <Tags dashboard={dashboard} onTagClick={onTagClick} />}

				{onDelete ? (
					<>
						{dashboard.visibility === 'public' ? (
							<p className="bg-pro-green-100 text-pro-green-400 dark:bg-pro-green-300/20 dark:text-pro-green-200 flex items-center gap-1 rounded-md px-2 py-1.25 text-xs">
								<Icon name="earth" height={12} width={12} />
								<span>Public </span>
							</p>
						) : (
							<p className="bg-pro-gold-100 text-pro-gold-400 dark:bg-pro-gold-300/20 dark:text-pro-gold-200 flex items-center gap-1 rounded-md px-2 py-1.25 text-xs">
								<Icon name="key" height={12} width={12} />
								<span>Private</span>
							</p>
						)}
						<Tooltip
							content="Delete dashboard"
							render={<button disabled={isDeleting} onClick={(e) => handleDelete(dashboard.id, e)} />}
							className="z-10 flex items-center justify-center gap-2 rounded-md bg-red-500/10 px-2 py-1.75 text-sm font-medium text-(--error)"
						>
							{isDeleting ? <LoadingSpinner size={12} /> : <Icon name="trash-2" height={12} width={12} />}
						</Tooltip>
					</>
				) : null}
			</div>

			{viewMode === 'grid' && <Tags dashboard={dashboard} onTagClick={onTagClick} />}

			{dashboard.description ? (
				<p className="line-clamp-2 text-sm text-(--text-label)">{dashboard.description}</p>
			) : null}

			{dashboard.data.items?.length ? (
				<div className={`flex flex-col ${viewMode === 'grid' ? 'mt-5' : 'mt-2'}`}>
					<span className="flex items-center gap-1 text-(--text-label)">
						<Icon name="layers" height={14} width={14} />
						<p className="flex items-center gap-1">{dashboard.data.items.length} items</p>
					</span>
					<p className="text-xs text-(--text-form)">{itemTypes}</p>
				</div>
			) : null}

			<div
				className={`mt-auto flex items-center justify-between gap-2 text-(--text-label) ${viewMode === 'grid' ? 'pt-5' : 'pt-2'}`}
			>
				<div className="flex items-center gap-2">
					<p className="flex items-center gap-1" title="Views">
						<Icon name="eye" height={16} width={16} />
						<span className="sr-only">Views</span>
						<span>{dashboard.viewCount || 0}</span>
					</p>
					<p className="flex items-center gap-1" title="Likes">
						<Icon
							name="star"
							height={16}
							width={16}
							className={dashboard.liked ? 'fill-current text-yellow-400' : 'fill-none'}
						/>
						<span className="sr-only">Favorites</span>
						<span>{dashboard.likeCount || 0}</span>
					</p>
				</div>

				<p
					className="flex items-center gap-1 text-xs text-(--text-form)"
					title={new Date(dashboard.editedAt || dashboard.updated).toLocaleString()}
				>
					<Icon name="clock" height={12} width={12} />
					<span>Updated {new Date(dashboard.editedAt || dashboard.updated).toLocaleDateString()}</span>
				</p>
			</div>
			<BasicLink href={`/pro/${dashboard.id}`} className="absolute inset-0">
				<span className="sr-only">View dashboard</span>
			</BasicLink>
		</div>
	)
}

const Tags = ({ dashboard, onTagClick }: { dashboard: Dashboard; onTagClick?: (tag: string) => void }) => {
	if (!dashboard.tags || dashboard.tags.length === 0) return null
	return (
		<div className="flex max-w-[60%] flex-wrap items-center gap-1">
			{dashboard.tags.slice(0, 2).map((tag) => (
				<button
					key={tag}
					onClick={(e) => {
						e.stopPropagation()
						onTagClick?.(tag)
					}}
					className="z-10 rounded-full border border-(--switch-border) px-2 py-1 text-xs text-(--text-form) hover:border-transparent hover:bg-(--link-active-bg) hover:text-white"
				>
					{tag}
				</button>
			))}
			{dashboard.tags.length > 2 && <span className="text-xs">+{dashboard.tags.length - 2}</span>}
		</div>
	)
}
