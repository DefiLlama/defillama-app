import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type * as React from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { mutatePinnedMetrics } from '../pinnedUtils'
import { NavItemContent } from '../shared'
import type { TNavLink } from '../types'

const VERTICAL_SORTING_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement]

export default function ReorderablePinnedPages({ pinnedPages }: { pinnedPages: Array<TNavLink> }) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	)

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		if (!over || active.id === over.id) return

		const oldIndex = pinnedPages.findIndex(({ route }) => route === active.id)
		const newIndex = pinnedPages.findIndex(({ route }) => route === over.id)

		if (oldIndex === -1 || newIndex === -1) return

		mutatePinnedMetrics((currentRoutes) => arrayMove(currentRoutes, oldIndex, newIndex))
	}

	const sortableItems = pinnedPages.map(({ route }) => route)

	return (
		<DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={VERTICAL_SORTING_MODIFIERS}>
			<SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
				<div className="flex flex-col">
					{pinnedPages.map((page) => (
						<PinnedPageRow key={`pinned-page-reorder-${page.name}-${page.route}`} page={page} />
					))}
				</div>
			</SortableContext>
		</DndContext>
	)
}

function PinnedPageRow({ page }: { page: TNavLink }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.route })

	const style: React.CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition
	}

	return (
		<span
			ref={setNodeRef}
			style={style}
			className="group relative flex w-full items-start gap-1"
			data-dragging={isDragging}
		>
			<div
				className={`group/link -ml-1.5 flex w-full flex-1 items-start gap-3 rounded-md p-1.5 pr-10 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
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
			<Tooltip
				content="Unpin from navigation"
				render={
					<button
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
							mutatePinnedMetrics((routes) => routes.filter((route) => route !== page.route))
						}}
					/>
				}
				className="absolute top-1/2 right-1 hidden -translate-y-1/2 rounded-md bg-(--error) px-1 py-1 text-white group-focus-within:block group-hover:block"
			>
				<Icon name="x" className="h-4 w-4" />
			</Tooltip>
		</span>
	)
}
