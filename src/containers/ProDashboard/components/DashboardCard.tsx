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
		for (const item of dashboard.data.items ?? []) {
			if (!item || typeof item !== 'object') {
				continue
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
		}

		const sorted = Object.entries(counts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)

		const summary = sorted.map(([type, count]) => `${count} ${type}`).join(', ')

		let countsLength = 0
		for (const _ in counts) countsLength++
		if (countsLength > 3) {
			return `${summary} +${countsLength - 3} more`
		}

		return summary
	}, [dashboard.data.items])

	return (
		<div
			className={`relative isolate flex ${viewMode === 'grid' ? 'min-h-[220px]' : ''} flex-col overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-(--old-blue)/30 hover:bg-pro-blue-300/5 hover:shadow-lg hover:shadow-pro-blue-300/10 dark:hover:border-(--old-blue)/40 dark:hover:bg-pro-blue-300/10 ${className ?? ''}`}
		>
			<div className="h-1.5 w-full bg-gradient-to-r from-(--old-blue)/20 via-(--old-blue)/10 to-transparent" />

			<div className="flex flex-1 flex-col gap-1.5 p-3">
				<div className="flex flex-wrap items-center justify-end gap-2">
					<h2 className="mr-auto line-clamp-1 text-lg leading-tight font-bold">
						{dashboard.data.dashboardName || 'Untitled Dashboard'}
					</h2>

					{viewMode !== 'grid' && <Tags dashboard={dashboard} onTagClick={onTagClick} />}

					{onDelete ? (
						<>
							{dashboard.visibility === 'public' ? (
								<p className="flex items-center gap-1 rounded-md bg-pro-green-100 px-2 py-1.25 text-xs text-pro-green-400 dark:bg-pro-green-300/20 dark:text-pro-green-200">
									<Icon name="earth" height={12} width={12} />
									<span>Public</span>
								</p>
							) : (
								<p className="flex items-center gap-1 rounded-md bg-pro-gold-100 px-2 py-1.25 text-xs text-pro-gold-400 dark:bg-pro-gold-300/20 dark:text-pro-gold-200">
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
					<p className="mt-0.5 line-clamp-2 text-sm leading-snug text-(--text-label) opacity-80">
						{dashboard.description}
					</p>
				) : null}

				<div className={`mt-auto flex flex-col gap-2.5 ${viewMode === 'grid' ? 'pt-4' : 'pt-2'}`}>
					<div className="flex flex-wrap items-center gap-2">
						{dashboard.data.items?.length ? (
							<span
								className="flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-600 tabular-nums dark:text-blue-400"
								title={itemTypes}
							>
								<Icon name="layers" height={12} width={12} />
								{dashboard.data.items.length} items
							</span>
						) : null}
						<span
							className="flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-600 tabular-nums dark:text-blue-400"
							title="Views"
						>
							<Icon name="eye" height={12} width={12} />
							{dashboard.viewCount || 0}
						</span>
						<span
							className="flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-600 tabular-nums dark:text-blue-400"
							title="Likes"
						>
							<Icon name="star" height={12} width={12} className={dashboard.liked ? 'fill-current' : 'fill-none'} />
							{dashboard.likeCount || 0}
						</span>
					</div>
					<p
						className="flex items-center gap-1.5 text-xs text-(--text-form)"
						title={new Date(dashboard.editedAt || dashboard.updated).toLocaleString()}
					>
						<Icon name="clock" height={10} width={10} />
						<span>Updated {new Date(dashboard.editedAt || dashboard.updated).toLocaleDateString()}</span>
					</p>
				</div>
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
		<div className="flex max-w-[65%] flex-wrap items-center gap-1.5">
			{dashboard.tags.slice(0, 2).map((tag) => (
				<button
					key={tag}
					onClick={(e) => {
						e.stopPropagation()
						onTagClick?.(tag)
					}}
					className="z-10 max-w-[200px] truncate rounded-full border border-(--switch-border) bg-(--cards-bg) px-2.5 py-1 text-xs font-medium text-(--text-form) transition-all duration-150 hover:scale-105 hover:border-transparent hover:bg-(--link-active-bg) hover:text-white"
				>
					{tag}
				</button>
			))}
			{dashboard.tags.length > 2 && (
				<span className="rounded-full bg-(--bg-hover) px-2 py-1 text-xs text-(--text-label)">
					+{dashboard.tags.length - 2}
				</span>
			)}
		</div>
	)
}
