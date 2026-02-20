import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableItemProps {
	id: string
	isTable?: boolean
	children: React.ReactNode
	[key: string]: unknown
}

export function SortableItem({ id, isTable, children, ...rest }: SortableItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
	const style = {
		transform: CSS.Translate.toString(transform),
		transition,
		cursor: isDragging ? 'grabbing' : 'pointer',
		gridColumn: isTable ? '1/-1' : undefined,
		zIndex: isDragging ? 50 : 'auto',
		boxShadow: isDragging ? '0 12px 24px rgba(0, 0, 0, 0.25)' : 'none',
		scale: isDragging ? '1.02' : '1',
		opacity: isDragging ? 0.95 : 1,
		background: isDragging ? 'var(--cards-bg)' : undefined,
		borderRadius: isDragging ? '6px' : undefined
	}

	const tableListeners = isTable
		? { ...listeners, onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation() }
		: listeners
	return (
		<div ref={setNodeRef} style={style} {...rest} {...attributes} {...tableListeners}>
			{children}
		</div>
	)
}
