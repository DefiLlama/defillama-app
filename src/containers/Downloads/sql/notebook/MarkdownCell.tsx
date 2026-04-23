import { useCallback, useEffect, useRef, useState } from 'react'
import { NotebookMarkdown } from './NotebookMarkdown'

interface MarkdownCellProps {
	source: string
	onChange: (next: string) => void
	focused: boolean
	onFocus: () => void
	onBlur?: () => void
}

export function MarkdownCell({ source, onChange, focused, onFocus, onBlur }: MarkdownCellProps) {
	const [editing, setEditing] = useState(() => focused && source.length === 0)
	const textareaRef = useRef<HTMLTextAreaElement | null>(null)
	const wasSourceEmpty = useRef(source.length === 0)

	useEffect(() => {
		if (focused && wasSourceEmpty.current && source.length === 0) {
			setEditing(true)
		}
		wasSourceEmpty.current = source.length === 0
	}, [focused, source])

	useEffect(() => {
		if (editing && textareaRef.current) {
			textareaRef.current.focus()
			const end = textareaRef.current.value.length
			textareaRef.current.setSelectionRange(end, end)
			autoGrow(textareaRef.current)
		}
	}, [editing])

	const startEdit = useCallback(() => {
		setEditing(true)
		onFocus()
	}, [onFocus])

	const commit = useCallback(() => {
		setEditing(false)
		onBlur?.()
	}, [onBlur])

	if (editing) {
		return (
			<textarea
				ref={textareaRef}
				value={source}
				onChange={(e) => {
					onChange(e.target.value)
					autoGrow(e.target)
				}}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						e.preventDefault()
						commit()
					}
					if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
						e.preventDefault()
						commit()
					}
				}}
				placeholder="Write markdown… ⌘↵ to render"
				className="min-h-[60px] w-full resize-none rounded-sm border-0 bg-transparent px-0 py-1 font-mono text-[13px] text-(--text-primary) outline-none placeholder:text-(--text-tertiary)/70"
			/>
		)
	}

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={startEdit}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					startEdit()
				}
			}}
			className={`group min-h-[24px] cursor-text px-0 py-0.5 ${source.trim() ? '' : 'text-(--text-tertiary) italic'}`}
		>
			{source.trim() ? (
				<NotebookMarkdown content={source} />
			) : (
				<span className="text-xs">Click to write markdown…</span>
			)}
		</div>
	)
}

function autoGrow(el: HTMLTextAreaElement) {
	el.style.height = 'auto'
	el.style.height = `${Math.min(el.scrollHeight, 600)}px`
}
