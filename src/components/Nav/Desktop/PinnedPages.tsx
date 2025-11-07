import * as React from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '~/components/Icon'
import { Tooltip } from '../../Tooltip'
import { mutatePinnedMetrics } from '../pinnedUtils'
import { TNavLink } from '../types'
import { LinkToPage, NavItemContent } from './shared'

export const PinnedPages = React.memo(function PinnedPages({
	pinnedPages,
	asPath
}: {
	pinnedPages: Array<TNavLink>
	asPath: string
}) {
	const [isReordering, setIsReordering] = React.useState(false)

	React.useEffect(() => {
		if (pinnedPages.length <= 1 && isReordering) {
			setIsReordering(false)
		}
	}, [isReordering, pinnedPages.length, setIsReordering])

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 6 }
		})
	)

	const handleDragEnd = React.useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event
			if (!over || active.id === over.id) return

			const oldIndex = pinnedPages.findIndex(({ route }) => route === active.id)
			const newIndex = pinnedPages.findIndex(({ route }) => route === over.id)

			if (oldIndex === -1 || newIndex === -1) return

			const reordered = arrayMove(pinnedPages, oldIndex, newIndex)
			mutatePinnedMetrics(() => reordered.map(({ route }) => route))
		},
		[pinnedPages]
	)

	return (
		<div className="group/pinned flex flex-col">
			<div
				className="group flex items-center justify-between gap-3 rounded-md pt-1.5 text-xs opacity-65"
				data-reordering={isReordering}
			>
				<span>Pinned Pages</span>
				{pinnedPages.length > 1 ? (
					<button
						type="button"
						className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${
							isReordering ? '' : 'invisible group-focus-within/pinned:visible group-hover/pinned:visible'
						}`}
						onClick={() => setIsReordering((value) => !value)}
					>
						{isReordering ? 'Done' : 'Reorder'}
					</button>
				) : null}
			</div>
			{isReordering ? <p className="text-[11px] text-(--text-tertiary)">Drag to reorder, click X to unpin</p> : null}
			<DndContext
				sensors={sensors}
				onDragEnd={handleDragEnd}
				modifiers={[restrictToVerticalAxis, restrictToParentElement]}
			>
				<SortableContext items={pinnedPages.map(({ route }) => route)} strategy={verticalListSortingStrategy}>
					<div className="flex flex-col">
						{pinnedPages.map((page) => (
							<PinnedPageRow
								key={`pinned-page-${page.name}-${page.route}`}
								page={page}
								asPath={asPath}
								isReordering={isReordering}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	)
})

export const PinnedPageRow = ({
	page,
	asPath,
	isReordering
}: {
	page: TNavLink
	asPath: string
	isReordering: boolean
}) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: page.route,
		disabled: !isReordering
	})

	const style: React.CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition
	}

	const handleUnpin = React.useCallback(() => {
		mutatePinnedMetrics((routes) => routes.filter((route) => route !== page.route))
	}, [page.route])

	return (
		<span
			ref={setNodeRef}
			style={style}
			className="group relative flex w-full items-start gap-1"
			data-reordering={isReordering}
			data-dragging={isDragging}
		>
			{isReordering ? (
				<div
					className={`group/link -ml-1.5 flex w-full flex-1 items-start gap-3 rounded-md p-1.5 pr-10 hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
					data-dragging={isDragging}
				>
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<button
							type="button"
							className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
							aria-label={`Drag ${page.name}`}
							{...attributes}
							{...listeners}
						>
							<Icon name="menu" className="h-4 w-4" />
						</button>
						<NavItemContent name={page.name} icon={page.icon} attention={page.attention} />
					</div>
				</div>
			) : (
				<LinkToPage route={page.route} name={page.name} icon={page.icon} attention={page.attention} asPath={asPath} />
			)}
			<Tooltip
				content="Unpin from navigation"
				render={
					<button
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
							handleUnpin()
						}}
					/>
				}
				className="absolute top-1/2 right-1 hidden -translate-y-1/2 rounded-md bg-(--error) px-1 py-1 text-white group-hover:block group-data-[reordering=true]:block"
			>
				<Icon name="x" className="h-4 w-4" />
			</Tooltip>
		</span>
	)
}
