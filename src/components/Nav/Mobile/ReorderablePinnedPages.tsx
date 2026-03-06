import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type * as React from 'react'
import { Icon } from '~/components/Icon'
import { mutatePinnedMetrics } from '../pinnedUtils'
import type { TNavLink } from '../types'

const VERTICAL_SORTING_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement]

export default function ReorderablePinnedPages({ pinnedPages }: { pinnedPages: Array<TNavLink> }) {
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		if (!over || active.id === over.id) return

		const oldIndex = pinnedPages.findIndex(({ route }) => route === active.id)
		const newIndex = pinnedPages.findIndex(({ route }) => route === over.id)

		if (oldIndex === -1 || newIndex === -1) return

		const reordered = arrayMove(pinnedPages, oldIndex, newIndex)
		mutatePinnedMetrics(() => reordered.map(({ route }) => route))
	}

	const sortableItems = pinnedPages.map(({ route }) => route)

	return (
		<DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={VERTICAL_SORTING_MODIFIERS}>
			<SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
				<div className="mt-1 flex flex-col gap-1">
					{pinnedPages.map((page) => (
						<ReorderableRow key={`mobile-nav-pinned-${page.name}-${page.route}`} page={page} />
					))}
				</div>
			</SortableContext>
		</DndContext>
	)
}

function ReorderableRow({ page }: { page: TNavLink }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.route })

	const style: React.CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition
	}

	const handleUnpin = () => {
		mutatePinnedMetrics((routes) => routes.filter((route) => route !== page.route))
	}

	return (
		<div ref={setNodeRef} style={style} className="group relative" data-dragging={isDragging}>
			<div
				className={`group/link -ml-1.5 flex flex-1 items-start gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
				data-dragging={isDragging}
			>
				<div className="flex w-full items-center gap-2">
					<button
						type="button"
						className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
						aria-label={`Drag ${page.name}`}
						{...attributes}
						{...listeners}
					>
						<Icon name="menu" className="h-4 w-4" />
					</button>
					<span className="relative flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left leading-tight">
						{page.icon ? (
							<Icon name={page.icon as any} className="h-4 w-4 shrink-0" />
						) : page.name === 'LlamaAI' ? (
							<svg className="h-4 w-4 shrink-0">
								<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
							</svg>
						) : null}
						<span className="min-w-0 wrap-break-word">{page.name}</span>
						{page.attention ? (
							<span
								aria-hidden
								className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--error) shadow-[0_0_0_2px_var(--bg-main)]"
							/>
						) : null}
					</span>
					<button
						type="button"
						className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-(--error) hover:bg-(--error)/10 focus-visible:bg-(--error)/10"
						aria-label={`Unpin ${page.name}`}
						onClick={() => handleUnpin()}
					>
						<Icon name="x" className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	)
}
