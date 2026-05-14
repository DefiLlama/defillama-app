import { useEditorState, type Editor } from '@tiptap/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './ArticleEditorIcon'

export function RailButton({
	active,
	disabled,
	onClick,
	label,
	children
}: {
	active?: boolean
	disabled?: boolean
	onClick: () => void
	label: string
	children: ReactNode
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			disabled={disabled}
			className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
				active
					? 'bg-(--link-button) text-(--link-text)'
					: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
			}`}
		>
			{children}
		</button>
	)
}

export function RailDivider() {
	return <span aria-hidden className="mx-1 h-5 w-px bg-(--cards-border)" />
}

function TableRailButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			onMouseDown={(e) => e.preventDefault()}
			className="flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
		>
			{children}
		</button>
	)
}

export function TableControlsOverlay({ editor }: { editor: Editor }) {
	const [target, setTarget] = useState<HTMLElement | null>(null)
	const [rect, setRect] = useState<DOMRect | null>(null)
	const overlayRef = useRef<HTMLDivElement | null>(null)
	const targetRef = useRef<HTMLElement | null>(null)
	targetRef.current = target

	useEffect(() => {
		const root = editor.view.dom as HTMLElement

		const tableFromSelection = (): HTMLElement | null => {
			if (!editor.isActive('table')) return null
			try {
				const { from } = editor.view.state.selection
				const dom = editor.view.domAtPos(from).node
				let el: HTMLElement | null = dom.nodeType === 1 ? (dom as HTMLElement) : dom.parentElement
				while (el && el.tagName !== 'TABLE') el = el.parentElement
				return el && root.contains(el) ? el : null
			} catch {
				return null
			}
		}

		const tableFromPoint = (x: number, y: number): HTMLElement | null => {
			const el = document.elementFromPoint(x, y) as HTMLElement | null
			if (!el) return null
			if (overlayRef.current?.contains(el)) return targetRef.current
			const tableEl = el.closest('table') as HTMLElement | null
			return tableEl && root.contains(tableEl) ? tableEl : null
		}

		let lastX = -1
		let lastY = -1

		const compute = (): HTMLElement | null => {
			const sel = tableFromSelection()
			if (sel) return sel
			if (lastX < 0) return null
			return tableFromPoint(lastX, lastY)
		}

		const sync = () => {
			const next = compute()
			setTarget((prev) => (prev === next ? prev : next))
		}

		const onPointerMove = (e: PointerEvent) => {
			lastX = e.clientX
			lastY = e.clientY
			sync()
		}

		document.addEventListener('pointermove', onPointerMove, { passive: true })
		editor.on('selectionUpdate', sync)
		editor.on('transaction', sync)
		sync()

		return () => {
			document.removeEventListener('pointermove', onPointerMove)
			editor.off('selectionUpdate', sync)
			editor.off('transaction', sync)
		}
	}, [editor])

	useEffect(() => {
		if (!target) {
			setRect(null)
			return
		}
		const update = () => setRect(target.getBoundingClientRect())
		update()
		window.addEventListener('scroll', update, true)
		window.addEventListener('resize', update)
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
		ro?.observe(target)
		return () => {
			window.removeEventListener('scroll', update, true)
			window.removeEventListener('resize', update)
			ro?.disconnect()
		}
	}, [target])

	if (!target || !rect) return null

	const top = Math.max(8, rect.top - 44)
	const left = Math.max(8, rect.left)

	return (
		<div ref={overlayRef} style={{ position: 'fixed', top, left, zIndex: 40 }} className="article-table-overlay">
			<div className="flex items-center gap-0.5 rounded-lg border border-(--cards-border) bg-(--cards-bg)/95 p-1 shadow-[0_18px_36px_-18px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-(--cards-bg)/90">
				<span className="px-1.5 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					Table
				</span>
				<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
				<TableRailButton label="Toggle header row" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
					<span className="font-jetbrains text-[10px] tracking-wider">HDR</span>
				</TableRailButton>
				<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
				<TableRailButton label="Add row above" onClick={() => editor.chain().focus().addRowBefore().run()}>
					<span className="font-jetbrains text-[10px] tracking-wider">↑R</span>
				</TableRailButton>
				<TableRailButton label="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
					<span className="font-jetbrains text-[10px] tracking-wider">↓R</span>
				</TableRailButton>
				<TableRailButton label="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
					<span className="font-jetbrains text-[10px] tracking-wider">−R</span>
				</TableRailButton>
				<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
				<TableRailButton label="Add column left" onClick={() => editor.chain().focus().addColumnBefore().run()}>
					<span className="font-jetbrains text-[10px] tracking-wider">←C</span>
				</TableRailButton>
				<TableRailButton label="Add column right" onClick={() => editor.chain().focus().addColumnAfter().run()}>
					<span className="font-jetbrains text-[10px] tracking-wider">→C</span>
				</TableRailButton>
				<TableRailButton label="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
					<span className="font-jetbrains text-[10px] tracking-wider">−C</span>
				</TableRailButton>
				<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
				<TableRailButton label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
					<Icon name="x" className="h-3.5 w-3.5" />
				</TableRailButton>
			</div>
		</div>
	)
}

export type EditorFlags = {
	bold: boolean
	italic: boolean
	underline: boolean
	strike: boolean
	code: boolean
	highlight: boolean
	link: boolean
	entityLink: boolean
	h2: boolean
	h3: boolean
	bulletList: boolean
	orderedList: boolean
	blockquote: boolean
	codeBlock: boolean
	inTable: boolean
	canUndo: boolean
	canRedo: boolean
}

const EMPTY_FLAGS: EditorFlags = {
	bold: false,
	italic: false,
	underline: false,
	strike: false,
	code: false,
	highlight: false,
	link: false,
	entityLink: false,
	h2: false,
	h3: false,
	bulletList: false,
	orderedList: false,
	blockquote: false,
	codeBlock: false,
	inTable: false,
	canUndo: false,
	canRedo: false
}

export function useEditorFlags(editor: Editor | null): EditorFlags {
	return (
		useEditorState({
			editor,
			selector: ({ editor: e }) =>
				e
					? {
							bold: e.isActive('bold'),
							italic: e.isActive('italic'),
							underline: e.isActive('underline'),
							strike: e.isActive('strike'),
							code: e.isActive('code'),
							highlight: e.isActive('highlight'),
							link: e.isActive('link'),
							entityLink: e.isActive('entityLink'),
							h2: e.isActive('heading', { level: 2 }),
							h3: e.isActive('heading', { level: 3 }),
							bulletList: e.isActive('bulletList'),
							orderedList: e.isActive('orderedList'),
							blockquote: e.isActive('blockquote'),
							codeBlock: e.isActive('codeBlock'),
							inTable: e.isActive('table'),
							canUndo: e.can().undo(),
							canRedo: e.can().redo()
						}
					: EMPTY_FLAGS,
			equalityFn: (a, b) => {
				if (!a || !b) return a === b
				const ka = Object.keys(a) as (keyof EditorFlags)[]
				return ka.every((k) => a[k] === b[k])
			}
		}) ?? EMPTY_FLAGS
	)
}

export type ActiveEntityLink = {
	entityType: string | null
	slug: string | null
	label: string | null
	route: string | null
}

export function useActiveEntityLink(editor: Editor | null): ActiveEntityLink | null {
	return (
		useEditorState({
			editor,
			selector: ({ editor: e }) => {
				if (!e || !e.isActive('entityLink')) return null
				const a = e.getAttributes('entityLink')
				return {
					entityType: (a.entityType as string | null) ?? null,
					slug: (a.slug as string | null) ?? null,
					label: (a.label as string | null) ?? null,
					route: (a.route as string | null) ?? null
				}
			},
			equalityFn: (a, b) => {
				if (!a && !b) return true
				if (!a || !b) return false
				return a.entityType === b.entityType && a.slug === b.slug && a.route === b.route && a.label === b.label
			}
		}) ?? null
	)
}

export type MarkButton = {
	name: string
	label: string
	icon: string
	isActive: () => boolean
	toggle: () => void
}

export type BlockItem = { label: string; hint?: string; run: () => void }
