import * as Ariakit from '@ariakit/react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import {
	addCollaborator,
	ArticleApiError,
	createArticle,
	deleteArticle,
	getOwnedArticle,
	listCollaborators,
	publishArticle,
	removeCollaborator,
	unpublishArticle,
	updateArticle as updateRemoteArticle
} from '../api'
import { createEmptyLocalArticle, normalizeLocalArticleDocument } from '../document'
import { ResearchLoader } from '../ResearchLoader'
import type {
	ArticleCalloutTone,
	ArticleChartConfig,
	ArticleCollaborator,
	ArticleEmbedConfig,
	LocalArticleDocument
} from '../types'
import { ImageUploadButton } from '../upload/ImageUploadButton'
import { type UploadResult, useImageUpload } from '../upload/useImageUpload'
import { ArticleChartPickerDialog } from './ArticleChartPicker'
import { EmbedPicker } from './EmbedPicker'
import { createArticleEditorExtensions } from './extensions'
import { triggerInlineImagePicker, type ArticleImageUploadFn } from './nodes/ArticleImage'
import type { ArticlePeoplePanelConfig } from './peoplePanel'
import { PeoplePanelDialog } from './PeoplePanelDialog'

function Icon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
	const props = {
		className,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.75,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const
	}
	switch (name) {
		case 'bold':
			return (
				<svg {...props}>
					<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
				</svg>
			)
		case 'italic':
			return (
				<svg {...props}>
					<line x1="14" y1="5" x2="10" y2="19" />
					<line x1="9" y1="5" x2="15" y2="5" />
					<line x1="9" y1="19" x2="15" y2="19" />
				</svg>
			)
		case 'underline':
			return (
				<svg {...props}>
					<path d="M7 5v7a5 5 0 0 0 10 0V5" />
					<line x1="6" y1="20" x2="18" y2="20" />
				</svg>
			)
		case 'strike':
			return (
				<svg {...props}>
					<line x1="4" y1="12" x2="20" y2="12" />
					<path d="M16 7a4 4 0 0 0-8-1c0 2 2 3 4 3M8 17a4 4 0 0 0 8 1c0-1.5-1-2.5-2.5-3" />
				</svg>
			)
		case 'code':
			return (
				<svg {...props}>
					<polyline points="8 6 3 12 8 18" />
					<polyline points="16 6 21 12 16 18" />
				</svg>
			)
		case 'highlight':
			return (
				<svg {...props}>
					<path d="M15 5l4 4-9 9H6v-4z" />
					<line x1="14" y1="6" x2="18" y2="10" />
					<line x1="3" y1="22" x2="21" y2="22" />
				</svg>
			)
		case 'link':
			return (
				<svg {...props}>
					<path d="M10 13a4 4 0 0 0 5.5 0l3-3a4 4 0 0 0-5.5-5.5l-1.5 1.5" />
					<path d="M14 11a4 4 0 0 0-5.5 0l-3 3a4 4 0 0 0 5.5 5.5l1.5-1.5" />
				</svg>
			)
		case 'plus':
			return (
				<svg {...props}>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			)
		case 'check':
			return (
				<svg {...props}>
					<polyline points="5 12 10 17 19 8" />
				</svg>
			)
		case 'x':
			return (
				<svg {...props}>
					<line x1="6" y1="6" x2="18" y2="18" />
					<line x1="6" y1="18" x2="18" y2="6" />
				</svg>
			)
		case 'external':
			return (
				<svg {...props}>
					<path d="M14 5h5v5" />
					<line x1="10" y1="14" x2="19" y2="5" />
					<path d="M19 13v6H5V5h6" />
				</svg>
			)
		case 'h2':
			return (
				<svg {...props}>
					<text
						x="12"
						y="16"
						textAnchor="middle"
						fontSize="13"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						H2
					</text>
				</svg>
			)
		case 'h3':
			return (
				<svg {...props}>
					<text
						x="12"
						y="16"
						textAnchor="middle"
						fontSize="13"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						H3
					</text>
				</svg>
			)
		case 'list-ul':
			return (
				<svg {...props}>
					<line x1="9" y1="6" x2="20" y2="6" />
					<line x1="9" y1="12" x2="20" y2="12" />
					<line x1="9" y1="18" x2="20" y2="18" />
					<circle cx="5" cy="6" r="0.8" fill="currentColor" />
					<circle cx="5" cy="12" r="0.8" fill="currentColor" />
					<circle cx="5" cy="18" r="0.8" fill="currentColor" />
				</svg>
			)
		case 'list-ol':
			return (
				<svg {...props}>
					<line x1="10" y1="6" x2="20" y2="6" />
					<line x1="10" y1="12" x2="20" y2="12" />
					<line x1="10" y1="18" x2="20" y2="18" />
					<text
						x="4"
						y="8"
						fontSize="6"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						1
					</text>
					<text
						x="4"
						y="14"
						fontSize="6"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						2
					</text>
					<text
						x="4"
						y="20"
						fontSize="6"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						3
					</text>
				</svg>
			)
		case 'quote':
			return (
				<svg {...props}>
					<path d="M7 7c-2 0-3 1.5-3 3v3h4v-3H6c0-1 .5-2 1.5-2zM17 7c-2 0-3 1.5-3 3v3h4v-3h-2c0-1 .5-2 1.5-2z" />
				</svg>
			)
		case 'code-block':
			return (
				<svg {...props}>
					<rect x="3" y="5" width="18" height="14" rx="2" />
					<polyline points="9 10 7 12 9 14" />
					<polyline points="15 10 17 12 15 14" />
				</svg>
			)
		case 'chart':
			return (
				<svg {...props}>
					<path d="M4 19V5M4 19h16" />
					<path d="M8 15l3-4 3 3 4-7" />
				</svg>
			)
		case 'callout':
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="9" />
					<line x1="12" y1="8" x2="12" y2="13" />
					<circle cx="12" cy="16" r="0.6" fill="currentColor" />
				</svg>
			)
		case 'cite':
			return (
				<svg {...props}>
					<path d="M6 5h-2v14h2M18 5h2v14h-2" />
					<line x1="9" y1="9" x2="15" y2="9" />
					<line x1="9" y1="13" x2="15" y2="13" />
					<line x1="9" y1="17" x2="13" y2="17" />
				</svg>
			)
		case 'undo':
			return (
				<svg {...props}>
					<path d="M9 14l-4-4 4-4" />
					<path d="M5 10h9a5 5 0 1 1 0 10h-3" />
				</svg>
			)
		case 'redo':
			return (
				<svg {...props}>
					<path d="M15 14l4-4-4-4" />
					<path d="M19 10h-9a5 5 0 1 0 0 10h3" />
				</svg>
			)
		case 'sliders':
			return (
				<svg {...props}>
					<line x1="4" y1="7" x2="20" y2="7" />
					<line x1="4" y1="17" x2="20" y2="17" />
					<circle cx="9" cy="7" r="2.2" fill="var(--cards-bg)" />
					<circle cx="15" cy="17" r="2.2" fill="var(--cards-bg)" />
				</svg>
			)
		case 'eye':
			return (
				<svg {...props}>
					<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			)
		case 'table':
			return (
				<svg {...props}>
					<rect x="3.5" y="5" width="17" height="14" rx="1.5" />
					<line x1="3.5" y1="10" x2="20.5" y2="10" />
					<line x1="3.5" y1="14.5" x2="20.5" y2="14.5" />
					<line x1="9.5" y1="5" x2="9.5" y2="19" />
					<line x1="15.5" y1="5" x2="15.5" y2="19" />
				</svg>
			)
		case 'embed':
			return (
				<svg {...props}>
					<rect x="3.5" y="5" width="17" height="14" rx="1.5" />
					<path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
				</svg>
			)
		case 'more':
			return (
				<svg {...props}>
					<circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
					<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
					<circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
				</svg>
			)
		case 'image':
			return (
				<svg {...props}>
					<rect x="3" y="5" width="18" height="14" rx="1.5" />
					<circle cx="9" cy="10" r="1.5" />
					<path d="m21 16-5-5-4 4-2-2-7 7" />
				</svg>
			)
		case 'people':
			return (
				<svg {...props}>
					<circle cx="9" cy="9" r="3" />
					<path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
					<circle cx="16.5" cy="10.5" r="2.5" />
					<path d="M14.5 19a4.5 4.5 0 0 1 6 0" />
				</svg>
			)
		default:
			return null
	}
}

function RailButton({
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

function RailDivider() {
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

function TableControlsOverlay({ editor }: { editor: Editor }) {
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

function slugFromTitle(title: string) {
	return (
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 120) || 'local-article'
	)
}

function formatRelative(iso: string | null | undefined) {
	if (!iso) return null
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return null
	const diff = Date.now() - date.getTime()
	if (diff < 5_000) return 'just now'
	if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type EditorFlags = {
	bold: boolean
	italic: boolean
	underline: boolean
	strike: boolean
	code: boolean
	highlight: boolean
	link: boolean
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

function useEditorFlags(editor: Editor | null): EditorFlags {
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

function useTicker(intervalMs = 30_000) {
	const [, set] = useState(0)
	useEffect(() => {
		const id = setInterval(() => set((c) => c + 1), intervalMs)
		return () => clearInterval(id)
	}, [intervalMs])
}

type MarkButton = {
	name: string
	label: string
	icon: string
	isActive: () => boolean
	toggle: () => void
}

type BlockItem = { label: string; hint?: string; run: () => void }

function MetaSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="grid gap-3">
			<h3 className="text-[10px] font-medium tracking-[0.18em] text-(--text-tertiary) uppercase">{title}</h3>
			{children}
		</section>
	)
}

export function ArticleEditorClient({ articleId }: { articleId?: string }) {
	const router = useRouter()
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const [article, setArticle] = useState<LocalArticleDocument>(() => createEmptyLocalArticle())
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [isDirty, setIsDirty] = useState(false)
	const [savedAt, setSavedAt] = useState<string | null>(null)
	const [wordCount, setWordCount] = useState(0)
	const [linkEdit, setLinkEdit] = useState<{ url: string } | null>(null)
	const linkInputRef = useRef<HTMLInputElement | null>(null)
	const inlineUploadRef = useRef<ArticleImageUploadFn | null>(null)
	const inlineArticleIdRef = useRef<string | null | undefined>(undefined)
	const inlineMissingArticleRef = useRef<() => void>(() => {})
	const extensions = useMemo(
		() =>
			createArticleEditorExtensions({
				uploadRef: inlineUploadRef,
				articleIdRef: inlineArticleIdRef,
				onMissingArticleId: () => inlineMissingArticleRef.current?.()
			}),
		[]
	)
	const chartDialog = Ariakit.useDialogStore()
	const embedDialog = Ariakit.useDialogStore()
	const peoplePanelDialog = Ariakit.useDialogStore()
	const metaDialog = Ariakit.useDialogStore()
	const [editingChart, setEditingChart] = useState<{ config: ArticleChartConfig; pos: number } | null>(null)
	const [editingEmbed, setEditingEmbed] = useState<{ config: ArticleEmbedConfig; pos: number } | null>(null)
	const [editingPanel, setEditingPanel] = useState<{ config: ArticlePeoplePanelConfig; pos: number } | null>(null)
	const [saveError, setSaveError] = useState(false)
	const [slugEditing, setSlugEditing] = useState(false)
	const [slugDraft, setSlugDraft] = useState('')
	const [collaborators, setCollaborators] = useState<ArticleCollaborator[]>([])
	const [collaboratorsLoading, setCollaboratorsLoading] = useState(false)
	const [collaboratorEmail, setCollaboratorEmail] = useState('')
	const [collaboratorAdding, setCollaboratorAdding] = useState(false)
	const [collaboratorError, setCollaboratorError] = useState<string | null>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const autoCreatingRef = useRef(false)
	const saveRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(async () => {})
	const articleIdRef = useRef<string | undefined>(article.id)
	articleIdRef.current = article.id

	const { uploadFile: uploadInlineImageRaw } = useImageUpload({
		scope: 'article-inline',
		articleId: article.id ?? null
	})

	const uploadInlineImage = useCallback<ArticleImageUploadFn>(
		(file: File): Promise<UploadResult> => {
			return toast.promise(uploadInlineImageRaw(file), {
				loading: 'Uploading image…',
				success: 'Image inserted',
				error: (err) => (err instanceof Error ? err.message : 'Upload failed')
			})
		},
		[uploadInlineImageRaw]
	)

	inlineUploadRef.current = uploadInlineImage
	inlineArticleIdRef.current = article.id
	inlineMissingArticleRef.current = () => {
		toast.error('Save the draft first to attach images')
	}

	const scheduleAutosave = useCallback(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		if (!articleIdRef.current) return
		debounceRef.current = setTimeout(() => {
			debounceRef.current = null
			void saveRef.current({ silent: true })
		}, 1500)
	}, [])

	useTicker()

	const editor = useEditor({
		extensions,
		content: article.contentJson,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class:
					'article-editor-prose prose prose-neutral dark:prose-invert max-w-none focus:outline-none prose-a:text-(--link-text) prose-headings:tracking-tight prose-headings:font-semibold min-h-[60vh] py-10 break-words [overflow-wrap:anywhere]'
			}
		},
		onUpdate: ({ editor: instance }) => {
			const text = instance.getText()
			setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
			setIsDirty(true)
			scheduleAutosave()
		}
	})

	const flags = useEditorFlags(editor)

	useEffect(() => {
		if (!editor) return
		if (loaders.userLoading) return
		if (!isAuthenticated) {
			setIsLoading(false)
			return
		}
		if (!articleId) {
			if (autoCreatingRef.current) return
			autoCreatingRef.current = true
			setIsLoading(true)
			createArticle(createEmptyLocalArticle(), authorizedFetch)
				.then((saved) => {
					void router.replace(`/research/edit/${saved.id}`)
				})
				.catch((error) => {
					autoCreatingRef.current = false
					setIsLoading(false)
					toast.error(error instanceof Error ? error.message : 'Failed to create draft')
				})
			return
		}
		let cancelled = false
		setIsLoading(true)
		getOwnedArticle(articleId, authorizedFetch)
			.then((loaded) => {
				if (cancelled) return
				setArticle(loaded)
				editor.commands.setContent(loaded.contentJson, { emitUpdate: false })
				setIsDirty(false)
				setSaveError(false)
				const text = loaded.plainText || ''
				setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
				setSavedAt(loaded.updatedAt)
			})
			.catch((error) => {
				if (!cancelled) toast.error(error instanceof Error ? error.message : 'Failed to load research')
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [articleId, authorizedFetch, isAuthenticated, loaders.userLoading, editor, router])

	const updateArticle = useCallback(
		<K extends keyof LocalArticleDocument>(key: K, value: LocalArticleDocument[K]) => {
			setArticle((current) => ({
				...current,
				[key]: value,
				...(key === 'title' && current.slug === 'local-article' ? { slug: slugFromTitle(String(value)) } : {})
			}))
			setIsDirty(true)
			scheduleAutosave()
		},
		[scheduleAutosave]
	)

	const saveArticle = async (opts: { silent?: boolean } = {}) => {
		if (!editor) return
		if (!isAuthenticated) {
			if (!opts.silent) toast.error('Please sign in to save research')
			return
		}
		if (debounceRef.current) {
			clearTimeout(debounceRef.current)
			debounceRef.current = null
		}
		setIsSaving(true)
		try {
			const normalized = normalizeLocalArticleDocument({ ...article, contentJson: editor.getJSON() })
			if (normalized.ok === false) throw new Error(normalized.error)
			const saved = article.id
				? await updateRemoteArticle(article.id, normalized.value, authorizedFetch)
				: await createArticle(normalized.value, authorizedFetch)
			setArticle(saved)
			setSavedAt(saved.updatedAt)
			setSaveError(false)
			if (!article.id) {
				void router.replace(`/research/edit/${saved.id}`)
			}
			setIsDirty(false)
		} catch (error) {
			setSaveError(true)
			if (!opts.silent) toast.error(error instanceof Error ? error.message : 'Failed to save research')
		} finally {
			setIsSaving(false)
		}
	}

	const openLinkEditor = useCallback(() => {
		if (!editor) return
		const previous = (editor.getAttributes('link').href as string | undefined) ?? ''
		setLinkEdit({ url: previous })
		setTimeout(() => linkInputRef.current?.focus(), 0)
	}, [editor])

	const handleLinkRail = useCallback(() => {
		if (!editor) return
		const { from, to } = editor.state.selection
		if (from === to) {
			const placeholder = 'link'
			editor
				.chain()
				.focus()
				.insertContent(placeholder)
				.setTextSelection({ from, to: from + placeholder.length })
				.run()
		}
		openLinkEditor()
	}, [editor, openLinkEditor])

	const applyLink = (raw: string) => {
		if (!editor) return
		const url = raw.trim()
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run()
		} else {
			const href = /^[a-z]+:|^\//i.test(url) ? url : `https://${url}`
			editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
		}
		setLinkEdit(null)
	}

	const beginSlugEdit = useCallback(() => {
		setSlugDraft(article.slug)
		setSlugEditing(true)
	}, [article.slug])

	const cancelSlugEdit = useCallback(() => {
		setSlugEditing(false)
	}, [])

	const commitSlugEdit = useCallback(() => {
		const next = slugFromTitle(slugDraft)
		if (!next || next === article.slug) {
			setSlugEditing(false)
			return
		}
		setArticle((current) => ({ ...current, slug: next }))
		setIsDirty(true)
		setSlugEditing(false)
		if (debounceRef.current) {
			clearTimeout(debounceRef.current)
			debounceRef.current = null
		}
		void saveRef.current({ silent: true })
	}, [slugDraft, article.slug])

	saveRef.current = saveArticle

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'S')) {
				event.preventDefault()
				saveRef.current()
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [])

	useEffect(() => {
		if (!isDirty) return
		const handler = (event: BeforeUnloadEvent) => {
			event.preventDefault()
			event.returnValue = ''
		}
		window.addEventListener('beforeunload', handler)
		return () => window.removeEventListener('beforeunload', handler)
	}, [isDirty])

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [])

	useEffect(() => {
		const handler = (event: Event) => {
			const detail = (event as CustomEvent<{ config: ArticleChartConfig; pos: number }>).detail
			if (!detail) return
			setEditingChart({ config: detail.config, pos: detail.pos })
			chartDialog.show()
		}
		document.addEventListener('article:edit-chart', handler)
		return () => document.removeEventListener('article:edit-chart', handler)
	}, [chartDialog])

	useEffect(() => {
		const editHandler = (event: Event) => {
			const detail = (event as CustomEvent<{ config: ArticleEmbedConfig; pos: number }>).detail
			if (!detail) return
			setEditingEmbed({ config: detail.config, pos: detail.pos })
			embedDialog.show()
		}
		const openHandler = () => {
			setEditingEmbed(null)
			embedDialog.show()
		}
		document.addEventListener('article:edit-embed', editHandler)
		document.addEventListener('article:open-embed-picker', openHandler)
		return () => {
			document.removeEventListener('article:edit-embed', editHandler)
			document.removeEventListener('article:open-embed-picker', openHandler)
		}
	}, [embedDialog])

	useEffect(() => {
		const handler = () => {
			if (!editor) return
			if (!inlineArticleIdRef.current) {
				toast.error('Save the draft first to attach images')
				return
			}
			void triggerInlineImagePicker(editor, inlineUploadRef)
		}
		document.addEventListener('article:trigger-image-upload', handler)
		return () => document.removeEventListener('article:trigger-image-upload', handler)
	}, [editor])

	useEffect(() => {
		const editHandler = (event: Event) => {
			const detail = (event as CustomEvent<{ config: ArticlePeoplePanelConfig | null; pos: number }>).detail
			if (!detail || typeof detail.pos !== 'number') return
			setEditingPanel(detail.config ? { config: detail.config, pos: detail.pos } : null)
			peoplePanelDialog.show()
		}
		const openHandler = () => {
			setEditingPanel(null)
			peoplePanelDialog.show()
		}
		document.addEventListener('article:edit-people-panel', editHandler)
		document.addEventListener('article:open-people-panel-picker', openHandler)
		return () => {
			document.removeEventListener('article:edit-people-panel', editHandler)
			document.removeEventListener('article:open-people-panel-picker', openHandler)
		}
	}, [peoplePanelDialog])

	const chartDialogOpen = Ariakit.useStoreState(chartDialog, 'open')
	useEffect(() => {
		if (!chartDialogOpen) setEditingChart(null)
	}, [chartDialogOpen])

	const embedDialogOpen = Ariakit.useStoreState(embedDialog, 'open')
	useEffect(() => {
		if (!embedDialogOpen) setEditingEmbed(null)
	}, [embedDialogOpen])

	const peoplePanelDialogOpen = Ariakit.useStoreState(peoplePanelDialog, 'open')
	useEffect(() => {
		if (!peoplePanelDialogOpen) setEditingPanel(null)
	}, [peoplePanelDialogOpen])

	const handleChartSubmit = useCallback(
		(config: ArticleChartConfig) => {
			if (!editor) return
			if (editingChart) {
				const tr = editor.state.tr.setNodeMarkup(editingChart.pos, undefined, { config })
				editor.view.dispatch(tr)
				setEditingChart(null)
			} else {
				editor.chain().focus().insertDefillamaChart(config).run()
			}
		},
		[editor, editingChart]
	)

	const handleEmbedSubmit = useCallback(
		(config: ArticleEmbedConfig) => {
			if (!editor) return
			if (editingEmbed) {
				const tr = editor.state.tr.setNodeMarkup(editingEmbed.pos, undefined, { config })
				editor.view.dispatch(tr)
				setEditingEmbed(null)
			} else {
				editor.chain().focus().insertArticleEmbed(config).run()
			}
		},
		[editor, editingEmbed]
	)

	const handlePeoplePanelSubmit = useCallback(
		(config: ArticlePeoplePanelConfig) => {
			if (!editor) return
			if (editingPanel) {
				editor.chain().focus().updatePeoplePanel({ pos: editingPanel.pos, config }).run()
				setEditingPanel(null)
			} else {
				editor.chain().focus().insertPeoplePanel(config).run()
			}
		},
		[editor, editingPanel]
	)

	const [isPublishing, setIsPublishing] = useState(false)

	const handlePublish = async () => {
		if (!article.id) {
			toast.error('Save the draft before publishing')
			return
		}
		setIsPublishing(true)
		try {
			const saved = await publishArticle(article.id, authorizedFetch)
			setArticle(saved)
			setSavedAt(saved.updatedAt)
			toast.success('Published')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to publish')
		} finally {
			setIsPublishing(false)
		}
	}

	const handleUnpublish = async () => {
		if (!article.id) return
		setIsPublishing(true)
		try {
			const saved = await unpublishArticle(article.id, authorizedFetch)
			setArticle(saved)
			setSavedAt(saved.updatedAt)
			toast.success('Moved to drafts')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to unpublish')
		} finally {
			setIsPublishing(false)
		}
	}

	const handleDeleteArticle = async () => {
		if (!article.id) return
		if (!confirm('Delete this draft? This cannot be undone.')) return
		try {
			await deleteArticle(article.id, authorizedFetch)
			void router.replace('/research')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete')
		}
	}

	const isOwner = article.viewerRole === 'owner'
	const isCollaborator = article.viewerRole === 'collaborator'

	const refreshCollaborators = useCallback(async () => {
		if (!article.id) return
		setCollaboratorsLoading(true)
		try {
			const list = await listCollaborators(article.id, authorizedFetch)
			setCollaborators(list)
		} catch (error) {
			if (error instanceof ArticleApiError && error.status === 403) {
				setCollaborators([])
			} else if (error instanceof Error) {
				toast.error(error.message)
			}
		} finally {
			setCollaboratorsLoading(false)
		}
	}, [article.id, authorizedFetch])

	useEffect(() => {
		if (!article.id) {
			setCollaborators([])
			return
		}
		void refreshCollaborators()
	}, [article.id, refreshCollaborators])

	const handleAddCollaborator = async () => {
		if (!article.id) return
		const email = collaboratorEmail.trim()
		if (!email) {
			setCollaboratorError('Enter an email address')
			return
		}
		setCollaboratorAdding(true)
		setCollaboratorError(null)
		try {
			await addCollaborator(article.id, email, authorizedFetch)
			setCollaboratorEmail('')
			await refreshCollaborators()
			toast.success('Co-author added')
		} catch (error) {
			const message =
				error instanceof ArticleApiError ? error.message : error instanceof Error ? error.message : 'Failed to add co-author'
			setCollaboratorError(message)
		} finally {
			setCollaboratorAdding(false)
		}
	}

	const handleRemoveCollaborator = async (pbUserId: string) => {
		if (!article.id) return
		try {
			await removeCollaborator(article.id, pbUserId, authorizedFetch)
			await refreshCollaborators()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove co-author')
		}
	}

	const insertCallout = (tone: ArticleCalloutTone) => editor?.chain().focus().insertCallout(tone).run()

	const insertCitation = () => {
		if (!editor) return
		const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n')
		const existing = (text.match(/\[(\d+)\]/g) ?? []).map((m) => Number(m.slice(1, -1)))
		const next = existing.length ? Math.max(...existing) + 1 : 1
		editor
			.chain()
			.focus()
			.insertCitation({ id: String(next), label: String(next) })
			.run()
	}

	if (isLoading) {
		return <ResearchLoader />
	}

	if (!isAuthenticated) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Sign in to write research</h1>
				<p className="text-sm text-(--text-secondary)">
					Article drafts, revisions, and author profiles are saved to your DefiLlama account.
				</p>
				<SignInModal
					text="Sign in"
					className="mr-auto rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white"
				/>
			</div>
		)
	}

	const titlePlaceholder = 'Untitled research'
	const savedLabel = savedAt ? formatRelative(savedAt) : null
	const readMins = Math.max(1, Math.ceil(wordCount / 220))

	const markButtons: MarkButton[] = editor
		? [
				{
					name: 'bold',
					label: 'Bold',
					icon: 'bold',
					isActive: () => flags.bold,
					toggle: () => editor.chain().focus().toggleBold().run()
				},
				{
					name: 'italic',
					label: 'Italic',
					icon: 'italic',
					isActive: () => flags.italic,
					toggle: () => editor.chain().focus().toggleItalic().run()
				},
				{
					name: 'underline',
					label: 'Underline',
					icon: 'underline',
					isActive: () => flags.underline,
					toggle: () => editor.chain().focus().toggleUnderline().run()
				},
				{
					name: 'strike',
					label: 'Strikethrough',
					icon: 'strike',
					isActive: () => flags.strike,
					toggle: () => editor.chain().focus().toggleStrike().run()
				},
				{
					name: 'code',
					label: 'Inline code',
					icon: 'code',
					isActive: () => flags.code,
					toggle: () => editor.chain().focus().toggleCode().run()
				},
				{
					name: 'highlight',
					label: 'Highlight',
					icon: 'highlight',
					isActive: () => flags.highlight,
					toggle: () => editor.chain().focus().toggleHighlight().run()
				}
			]
		: []

	const blockItems: BlockItem[] = editor
		? [
				{ label: 'Heading 2', hint: 'H2', run: () => editor.chain().focus().setNode('heading', { level: 2 }).run() },
				{ label: 'Heading 3', hint: 'H3', run: () => editor.chain().focus().setNode('heading', { level: 3 }).run() },
				{ label: 'Bullet list', hint: '•', run: () => editor.chain().focus().toggleBulletList().run() },
				{ label: 'Numbered list', hint: '1.', run: () => editor.chain().focus().toggleOrderedList().run() },
				{ label: 'Quote', hint: '"', run: () => editor.chain().focus().toggleBlockquote().run() },
				{ label: 'Code block', hint: '{ }', run: () => editor.chain().focus().toggleCodeBlock().run() }
			]
		: []

	const titleSerif = "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"

	const isPublished = article.status === 'published'
	const pillState: 'saving' | 'saved' | 'unsaved' | 'error' | 'idle' = isSaving
		? 'saving'
		: saveError
			? 'error'
			: isDirty
				? 'unsaved'
				: savedAt
					? 'saved'
					: 'idle'
	const pillLabel = (() => {
		switch (pillState) {
			case 'saving':
				return 'Saving…'
			case 'saved':
				return savedLabel ? `Saved ${savedLabel}` : 'Saved'
			case 'unsaved':
				return 'Unsaved'
			case 'error':
				return 'Offline — typing locally'
			default:
				return 'Ready'
		}
	})()
	const pillDot = (() => {
		switch (pillState) {
			case 'saving':
				return 'bg-(--text-secondary) animate-pulse'
			case 'saved':
				return 'bg-emerald-500'
			case 'unsaved':
				return 'bg-amber-500'
			case 'error':
				return 'bg-red-500'
			default:
				return 'bg-(--text-tertiary)/50'
		}
	})()

	return (
		<div className="article-editor-shell animate-fadein relative mx-auto w-full max-w-[760px] px-4 pb-32 sm:px-6">
			<header
				className={`mb-8 flex flex-wrap items-center justify-between gap-3 border-b py-4 ${
					isPublished ? 'border-emerald-500/25' : 'border-(--cards-border)'
				}`}
			>
				<nav className="flex min-w-0 items-center gap-2.5 text-sm">
					<Link href="/research" className="text-(--text-tertiary) hover:text-(--text-primary)">
						Articles
					</Link>
					<span aria-hidden className="text-(--text-tertiary)/50">
						›
					</span>
					{slugEditing ? (
						<input
							autoFocus
							value={slugDraft}
							onChange={(event) => setSlugDraft(event.target.value)}
							onBlur={commitSlugEdit}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault()
									commitSlugEdit()
								}
								if (event.key === 'Escape') {
									event.preventDefault()
									cancelSlugEdit()
								}
							}}
							className="w-[24ch] rounded border border-(--link-text)/40 bg-(--app-bg) px-1.5 py-0.5 font-jetbrains text-xs text-(--text-primary) focus:border-(--link-text) focus:outline-none"
						/>
					) : (
						<button
							type="button"
							onClick={beginSlugEdit}
							title="Click to edit slug"
							className="group flex max-w-[32ch] items-center gap-1 truncate rounded px-1 py-0.5 font-jetbrains text-xs tracking-tight text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
						>
							<span className="truncate">{article.slug}</span>
							<span aria-hidden className="text-(--text-tertiary) opacity-0 transition-opacity group-hover:opacity-100">
								✎
							</span>
						</button>
					)}
					<span aria-hidden className="text-(--text-tertiary)/40">
						·
					</span>
					<span
						className={`font-jetbrains text-[10px] font-medium tracking-[0.22em] uppercase ${
							isPublished ? 'text-emerald-500' : 'text-amber-500'
						}`}
					>
						{article.status}
					</span>
				</nav>

				<div className="flex items-center gap-2">
					<span
						aria-live="polite"
						className="hidden items-center gap-1.5 px-1 font-jetbrains text-[11px] text-(--text-secondary) sm:flex"
					>
						<span aria-hidden className={`h-1.5 w-1.5 rounded-full ${pillDot}`} />
						<span className="tabular-nums">{pillLabel}</span>
					</span>

					{isPublished ? (
						<Ariakit.MenuProvider>
							<Ariakit.MenuButton className="flex h-9 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 text-xs font-medium text-(--text-primary) transition-colors hover:border-(--link-text)/40">
								<span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
								<span>Live</span>
								<span aria-hidden className="text-(--text-tertiary)">
									▾
								</span>
							</Ariakit.MenuButton>
							<Ariakit.Menu
								gutter={6}
								className="z-50 grid min-w-[180px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
							>
								<Ariakit.MenuItem
									render={
										<Link
											href={`/research/${article.slug}`}
											target="_blank"
											rel="noreferrer"
											className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
										/>
									}
								>
									<span className="flex items-center gap-2">
										<Icon name="eye" className="h-3.5 w-3.5" />
										View
									</span>
									<Icon name="external" className="h-3 w-3 text-(--text-tertiary)" />
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={() => metaDialog.show()}
									className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<Icon name="sliders" className="h-3.5 w-3.5" />
									Edit listing
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={handleUnpublish}
									disabled={isPublishing}
									className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<Icon name="undo" className="h-3.5 w-3.5" />
									Move to drafts
								</Ariakit.MenuItem>
								{isOwner ? (
									<>
										<span aria-hidden className="my-1 h-px bg-(--cards-border)" />
										<Ariakit.MenuItem
											onClick={handleDeleteArticle}
											className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-red-500 data-[active-item]:bg-red-500/10"
										>
											<Icon name="x" className="h-3.5 w-3.5" />
											Delete
										</Ariakit.MenuItem>
									</>
								) : null}
							</Ariakit.Menu>
						</Ariakit.MenuProvider>
					) : article.id ? (
						<>
							<Link
								href={`/research/${article.slug}`}
								target="_blank"
								rel="noreferrer"
								className="flex h-9 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
							>
								<Icon name="eye" className="h-3.5 w-3.5" />
								<span>Preview</span>
							</Link>
							<button
								type="button"
								disabled={isPublishing}
								onClick={() => metaDialog.show()}
								className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 text-xs font-medium text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-500 hover:shadow-[0_6px_16px_-4px_rgba(16,185,129,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
							>
								<span>Publish</span>
								<span aria-hidden>→</span>
							</button>
						</>
					) : null}
				</div>
			</header>

			<div className="mb-2">
				<input
					value={article.title}
					onChange={(e) => updateArticle('title', e.target.value)}
					placeholder={titlePlaceholder}
					style={{ fontFamily: titleSerif }}
					className="article-title-input w-full bg-transparent text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-(--text-primary) placeholder:text-(--text-tertiary)/60 focus:outline-none md:text-[3.25rem]"
				/>
				<input
					value={article.subtitle ?? ''}
					onChange={(e) => updateArticle('subtitle', e.target.value)}
					placeholder="Add a subtitle…"
					style={{ fontFamily: titleSerif }}
					className="mt-3 w-full bg-transparent text-lg leading-snug text-(--text-secondary) italic placeholder:text-(--text-tertiary)/60 focus:outline-none md:text-xl"
				/>
				{article.author ? (
					<div className="mt-4 text-xs tracking-[0.18em] text-(--text-tertiary) uppercase">
						{(() => {
							const names = [article.author, ...(article.coAuthors ?? []).map((p) => p.displayName)]
							if (names.length <= 1) return `By ${names[0]}`
							if (names.length === 2) return `By ${names[0]} and ${names[1]}`
							return `By ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
						})()}
					</div>
				) : null}
			</div>

			<div className="article-editor-canvas relative mt-2">
				<EditorContent editor={editor} />

				{editor ? (
					<BubbleMenu
						editor={editor}
						options={{ placement: 'top' }}
						shouldShow={({ editor: e, from, to, state }) => {
							if (linkEdit) return true
							if (from === to) return false
							if (!e.isEditable) return false
							let blocked = false
							state.doc.nodesBetween(from, to, (n) => {
								if (
									n.type.name === 'defillamaChart' ||
									n.type.name === 'articleEmbed' ||
									n.type.name === 'callout' ||
									n.type.name === 'citation'
								)
									blocked = true
								return !blocked
							})
							if (blocked) return false
							return e.isFocused
						}}
						className="article-bubble-menu z-40"
					>
						<div className="flex items-center gap-0.5 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-1 shadow-[0_18px_36px_-18px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-(--cards-bg)/95">
							{linkEdit ? (
								<form
									onSubmit={(e) => {
										e.preventDefault()
										applyLink(linkEdit.url)
									}}
									className="flex items-center gap-1"
								>
									<input
										ref={linkInputRef}
										value={linkEdit.url}
										onChange={(e) => setLinkEdit({ url: e.target.value })}
										onKeyDown={(e) => {
											if (e.key === 'Escape') {
												e.preventDefault()
												setLinkEdit(null)
											}
										}}
										placeholder="Paste or type URL"
										className="w-64 rounded-md bg-transparent px-2 py-1 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-none"
									/>
									<button
										type="submit"
										aria-label="Save link"
										className="rounded-md p-1 text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
									>
										<Icon name="check" className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => applyLink('')}
										aria-label="Remove link"
										className="rounded-md p-1 text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
									>
										<Icon name="x" className="h-4 w-4" />
									</button>
									{flags.link && linkEdit.url ? (
										<a
											href={linkEdit.url}
											target="_blank"
											rel="noreferrer"
											aria-label="Open link"
											className="rounded-md p-1 text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
										>
											<Icon name="external" className="h-4 w-4" />
										</a>
									) : null}
								</form>
							) : (
								<>
									{markButtons.map((b) => (
										<button
											key={b.name}
											type="button"
											aria-label={b.label}
											title={b.label}
											onClick={b.toggle}
											className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
												b.isActive()
													? 'bg-(--link-button) text-(--link-text)'
													: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
											}`}
										>
											<Icon name={b.icon} className="h-3.5 w-3.5" />
										</button>
									))}
									<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
									<button
										type="button"
										aria-label="Link"
										title="Link"
										onClick={openLinkEditor}
										className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
											flags.link
												? 'bg-(--link-button) text-(--link-text)'
												: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
										}`}
									>
										<Icon name="link" className="h-3.5 w-3.5" />
									</button>
								</>
							)}
						</div>
					</BubbleMenu>
				) : null}

				{editor ? <TableControlsOverlay editor={editor} /> : null}

				{editor ? (
					<FloatingMenu
						editor={editor}
						options={{ placement: 'left-start', offset: 16 }}
						className="article-floating-menu z-30"
					>
						<Ariakit.MenuProvider>
							<Ariakit.MenuButton
								className="flex h-6 w-6 items-center justify-center rounded-full text-(--text-tertiary)/50 transition-all hover:bg-(--link-hover-bg) hover:text-(--text-primary) data-[active]:bg-(--link-button) data-[active]:text-(--link-text)"
								aria-label="Insert block"
							>
								<Icon name="plus" className="h-3.5 w-3.5" />
							</Ariakit.MenuButton>
							<Ariakit.Menu
								gutter={6}
								className="z-50 grid min-w-[200px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
							>
								{blockItems.map((item) => (
									<Ariakit.MenuItem
										key={item.label}
										onClick={item.run}
										className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span>{item.label}</span>
										{item.hint ? (
											<span className="font-jetbrains text-[10px] text-(--text-tertiary)">{item.hint}</span>
										) : null}
									</Ariakit.MenuItem>
								))}
								<span aria-hidden className="my-1 h-px bg-(--cards-border)" />
								<Ariakit.MenuItem
									onClick={() => chartDialog.show()}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>DefiLlama chart</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">↗</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>Table</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">3×3</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={() => {
										setEditingEmbed(null)
										embedDialog.show()
									}}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>Embed</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">URL</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={() => document.dispatchEvent(new CustomEvent('article:trigger-image-upload'))}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>Image</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">Upload</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={() => document.dispatchEvent(new CustomEvent('article:open-people-panel-picker'))}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>People panel</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">Bios</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuProvider>
									<Ariakit.MenuItem
										render={
											<Ariakit.MenuButton className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)">
												<span>Callout</span>
												<span aria-hidden className="text-(--text-tertiary)">
													›
												</span>
											</Ariakit.MenuButton>
										}
									/>
									<Ariakit.Menu
										gutter={4}
										className="z-50 grid min-w-[140px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
									>
										{(['note', 'data', 'warning', 'pullquote'] as ArticleCalloutTone[]).map((tone) => (
											<Ariakit.MenuItem
												key={tone}
												onClick={() => insertCallout(tone)}
												className="rounded px-2 py-1.5 text-xs text-(--text-secondary) capitalize data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
											>
												{tone}
											</Ariakit.MenuItem>
										))}
									</Ariakit.Menu>
								</Ariakit.MenuProvider>
								<Ariakit.MenuItem
									onClick={insertCitation}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>Citation</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">[n]</span>
								</Ariakit.MenuItem>
							</Ariakit.Menu>
						</Ariakit.MenuProvider>
					</FloatingMenu>
				) : null}
			</div>

			{editor ? (
				<div className="pointer-events-none sticky bottom-6 z-30 mt-10 flex justify-center">
					<div className="article-editor-rail pointer-events-auto inline-flex items-stretch gap-1 rounded-2xl border border-(--cards-border) bg-(--cards-bg)/95 p-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur supports-[backdrop-filter]:bg-(--cards-bg)/80">
						<div className="hidden items-center gap-1 pl-1 sm:flex">
							<RailButton label="Undo" disabled={!flags.canUndo} onClick={() => editor.chain().focus().undo().run()}>
								<Icon name="undo" className="h-4 w-4" />
							</RailButton>
							<RailButton label="Redo" disabled={!flags.canRedo} onClick={() => editor.chain().focus().redo().run()}>
								<Icon name="redo" className="h-4 w-4" />
							</RailButton>
							<RailDivider />
						</div>

						<div className="flex items-center gap-1">
							<RailButton
								label="Heading 2"
								active={flags.h2}
								onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
							>
								<Icon name="h2" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Heading 3"
								active={flags.h3}
								onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
							>
								<Icon name="h3" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Bullet list"
								active={flags.bulletList}
								onClick={() => editor.chain().focus().toggleBulletList().run()}
							>
								<Icon name="list-ul" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Numbered list"
								active={flags.orderedList}
								onClick={() => editor.chain().focus().toggleOrderedList().run()}
							>
								<Icon name="list-ol" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Quote"
								active={flags.blockquote}
								onClick={() => editor.chain().focus().toggleBlockquote().run()}
							>
								<Icon name="quote" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Code block"
								active={flags.codeBlock}
								onClick={() => editor.chain().focus().toggleCodeBlock().run()}
							>
								<Icon name="code-block" className="h-4 w-4" />
							</RailButton>
							<RailButton label="Link" active={flags.link} onClick={handleLinkRail}>
								<Icon name="link" className="h-4 w-4" />
							</RailButton>
						</div>

						<RailDivider />

						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => chartDialog.show()}
								className="flex h-9 items-center gap-1.5 rounded-md bg-(--link-button) px-3 text-xs font-medium text-(--link-text) transition-colors hover:opacity-90"
							>
								<Icon name="chart" className="h-4 w-4" />
								Chart
							</button>
							<Ariakit.MenuProvider>
								<Ariakit.MenuButton
									aria-label="Insert block"
									title="Insert"
									className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
								>
									<Icon name="more" className="h-4 w-4" />
									<span className="hidden sm:inline">Insert</span>
								</Ariakit.MenuButton>
								<Ariakit.Menu
									gutter={8}
									className="z-50 grid min-w-[200px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
								>
									<Ariakit.MenuItem
										onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="table" className="h-3.5 w-3.5" />
											Table
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">3×3</span>
									</Ariakit.MenuItem>
									<Ariakit.MenuItem
										onClick={() => {
											setEditingEmbed(null)
											embedDialog.show()
										}}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="embed" className="h-3.5 w-3.5" />
											Embed
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">URL</span>
									</Ariakit.MenuItem>
									<Ariakit.MenuItem
										onClick={() => document.dispatchEvent(new CustomEvent('article:trigger-image-upload'))}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="image" className="h-3.5 w-3.5" />
											Image
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">Upload</span>
									</Ariakit.MenuItem>
									<Ariakit.MenuItem
										onClick={() => document.dispatchEvent(new CustomEvent('article:open-people-panel-picker'))}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="people" className="h-3.5 w-3.5" />
											People panel
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">Bios</span>
									</Ariakit.MenuItem>
									<span aria-hidden className="my-1 h-px bg-(--cards-border)" />
									<Ariakit.MenuProvider>
										<Ariakit.MenuItem
											render={
												<Ariakit.MenuButton className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)">
													<span className="flex items-center gap-2">
														<Icon name="callout" className="h-3.5 w-3.5" />
														Callout
													</span>
													<span aria-hidden className="text-(--text-tertiary)">
														›
													</span>
												</Ariakit.MenuButton>
											}
										/>
										<Ariakit.Menu
											gutter={4}
											className="z-50 grid min-w-[140px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
										>
											{(['note', 'data', 'warning', 'pullquote'] as ArticleCalloutTone[]).map((tone) => (
												<Ariakit.MenuItem
													key={tone}
													onClick={() => insertCallout(tone)}
													className="rounded px-2 py-1.5 text-xs text-(--text-secondary) capitalize data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
												>
													{tone}
												</Ariakit.MenuItem>
											))}
										</Ariakit.Menu>
									</Ariakit.MenuProvider>
									<Ariakit.MenuItem
										onClick={insertCitation}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="cite" className="h-3.5 w-3.5" />
											Citation
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">[n]</span>
									</Ariakit.MenuItem>
								</Ariakit.Menu>
							</Ariakit.MenuProvider>
						</div>

						<RailDivider />

						<div className="hidden shrink-0 items-center gap-3 px-2 font-jetbrains text-[10px] tracking-wider whitespace-nowrap text-(--text-tertiary) uppercase md:flex">
							<span>{wordCount.toLocaleString()} words</span>
							<span aria-hidden className="h-3 w-px bg-(--cards-border)" />
							<span>{readMins} min</span>
						</div>
					</div>
				</div>
			) : null}

			<Ariakit.Dialog
				store={metaDialog}
				backdrop={
					<div className="fixed inset-0 z-40 bg-black/30 opacity-0 backdrop-blur-sm transition-opacity duration-200 data-[enter]:opacity-100 data-[leave]:opacity-0" />
				}
				className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md translate-x-full flex-col overflow-y-auto border-l border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl transition-transform duration-300 data-[enter]:translate-x-0 data-[leave]:translate-x-full"
			>
				<div className="mb-1 flex items-start justify-between gap-3">
					<div className="grid gap-1">
						<Ariakit.DialogHeading className="text-lg font-semibold tracking-tight text-(--text-primary)">
							{isPublished ? 'Edit listing' : 'Review & publish'}
						</Ariakit.DialogHeading>
						<p className="text-xs text-(--text-tertiary)">
							{isPublished
								? 'These details appear on the public article page and in shares.'
								: 'A quick review before this goes live.'}
						</p>
					</div>
					<Ariakit.DialogDismiss
						aria-label="Close"
						className="rounded-md p-1.5 text-(--text-secondary) hover:bg-(--link-hover-bg)"
					>
						<Icon name="x" className="h-4 w-4" />
					</Ariakit.DialogDismiss>
				</div>

				<div className="mt-6 grid gap-6">
					<MetaSection title="URL">
						<label className="grid gap-1.5">
							<input
								value={article.slug}
								onChange={(event) => updateArticle('slug', event.target.value)}
								className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 font-jetbrains text-xs text-(--text-primary) focus:border-(--link-text) focus:outline-none"
							/>
							<span className="truncate font-jetbrains text-[10px] text-(--text-tertiary)">
								defillama.com/research/<span className="text-(--text-secondary)">{article.slug}</span>
							</span>
						</label>
					</MetaSection>

					<MetaSection title="Listing">
						<label className="grid gap-1.5">
							<span className="text-xs text-(--text-secondary)">Subtitle</span>
							<input
								value={article.subtitle ?? ''}
								onChange={(event) => updateArticle('subtitle', event.target.value)}
								placeholder="Optional secondary line shown on cards"
								className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
							/>
						</label>
						<label className="grid gap-1.5">
							<span className="text-xs text-(--text-secondary)">Excerpt</span>
							<textarea
								value={article.excerpt ?? ''}
								onChange={(event) => updateArticle('excerpt', event.target.value)}
								placeholder="Auto-derived from your first paragraph. Override here if you want."
								rows={3}
								className="resize-none rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
							/>
						</label>
						<label className="grid gap-1.5">
							<span className="text-xs text-(--text-secondary)">Tags</span>
							<input
								value={(article.tags ?? []).join(', ')}
								onChange={(event) =>
									updateArticle(
										'tags',
										event.target.value
											.split(',')
											.map((tag) => tag.trim())
											.filter(Boolean)
									)
								}
								placeholder="stablecoins, lending, ethereum"
								className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
							/>
						</label>
					</MetaSection>

					<MetaSection title="Authors">
						<div className="grid gap-2">
							{collaboratorsLoading && collaborators.length === 0 ? (
								<div className="text-xs text-(--text-tertiary)">Loading…</div>
							) : null}
							{collaborators.map((entry) => (
								<div
									key={entry.pbUserId}
									className="flex items-center justify-between gap-3 rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2"
								>
									<div className="flex min-w-0 items-center gap-2">
										{entry.profile.avatarUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={entry.profile.avatarUrl}
												alt=""
												className="h-7 w-7 shrink-0 rounded-full object-cover"
											/>
										) : (
											<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-(--link-button) text-[11px] font-medium text-(--link-text)">
												{entry.profile.displayName.slice(0, 2).toUpperCase()}
											</span>
										)}
										<div className="min-w-0">
											<div className="truncate text-sm text-(--text-primary)">{entry.profile.displayName}</div>
											<div className="text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
												{entry.role === 'owner' ? 'Owner' : 'Co-author'}
											</div>
										</div>
									</div>
									{isOwner && entry.role === 'collaborator' ? (
										<button
											type="button"
											onClick={() => handleRemoveCollaborator(entry.pbUserId)}
											className="text-xs text-(--text-tertiary) transition-colors hover:text-red-500"
										>
											Remove
										</button>
									) : null}
								</div>
							))}
						</div>
						{isOwner ? (
							<div className="grid gap-1.5">
								<div className="flex gap-2">
									<input
										type="email"
										value={collaboratorEmail}
										onChange={(event) => {
											setCollaboratorEmail(event.target.value)
											if (collaboratorError) setCollaboratorError(null)
										}}
										onKeyDown={(event) => {
											if (event.key === 'Enter') {
												event.preventDefault()
												void handleAddCollaborator()
											}
										}}
										placeholder="Add co-author by email"
										disabled={collaboratorAdding}
										className="flex-1 rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none disabled:opacity-60"
									/>
									<button
										type="button"
										onClick={handleAddCollaborator}
										disabled={collaboratorAdding || !collaboratorEmail.trim()}
										className="rounded-md bg-(--link-text) px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{collaboratorAdding ? 'Adding…' : 'Add'}
									</button>
								</div>
								{collaboratorError ? (
									<span className="text-xs text-red-500">{collaboratorError}</span>
								) : (
									<span className="text-[11px] text-(--text-tertiary)">
										Co-authors can edit, publish, and unpublish. Only you can manage authors or delete.
									</span>
								)}
							</div>
						) : isCollaborator ? (
							<span className="text-[11px] text-(--text-tertiary)">
								Only the owner can manage authors.
							</span>
						) : null}
					</MetaSection>

					<MetaSection title="Cover">
						<ImageUploadButton
							scope="article-cover"
							articleId={articleId}
							currentUrl={article.coverImage?.url ?? null}
							onUploaded={(result) =>
								updateArticle('coverImage', {
									...(article.coverImage ?? {}),
									url: result.url,
									alt: article.coverImage?.alt || article.title
								})
							}
							onCleared={() => updateArticle('coverImage', null)}
							label="cover image"
							helperText="PNG, JPEG, WebP, or GIF · up to 8 MB"
						/>
						{article.coverImage ? (
							<div className="mt-3 grid gap-2">
								<label className="grid gap-1">
									<span className="text-[11px] text-(--text-tertiary)">Headline</span>
									<input
										value={article.coverImage.headline ?? ''}
										onChange={(event) =>
											updateArticle('coverImage', {
												...article.coverImage!,
												headline: event.target.value
											})
										}
										placeholder="Image title"
										className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
									/>
								</label>
								<label className="grid gap-1">
									<span className="text-[11px] text-(--text-tertiary)">Caption</span>
									<input
										value={article.coverImage.caption ?? ''}
										onChange={(event) =>
											updateArticle('coverImage', {
												...article.coverImage!,
												caption: event.target.value
											})
										}
										placeholder="Caption shown under the cover"
										className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
									/>
								</label>
								<div className="grid grid-cols-2 gap-2">
									<label className="grid gap-1">
										<span className="text-[11px] text-(--text-tertiary)">Credit</span>
										<input
											value={article.coverImage.credit ?? ''}
											onChange={(event) =>
												updateArticle('coverImage', {
													...article.coverImage!,
													credit: event.target.value
												})
											}
											placeholder="Photographer"
											className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
										/>
									</label>
									<label className="grid gap-1">
										<span className="text-[11px] text-(--text-tertiary)">Copyright</span>
										<input
											value={article.coverImage.copyright ?? ''}
											onChange={(event) =>
												updateArticle('coverImage', {
													...article.coverImage!,
													copyright: event.target.value
												})
											}
											placeholder="Rights holder"
											className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
										/>
									</label>
								</div>
							</div>
						) : null}
					</MetaSection>
				</div>

				<div className="mt-auto grid gap-2 border-t border-(--cards-border) pt-4">
					{isPublished ? (
						<button
							type="button"
							disabled={isSaving}
							onClick={async () => {
								await saveArticle()
								metaDialog.hide()
							}}
							className="flex h-10 items-center justify-center rounded-md bg-(--link-text) px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSaving ? 'Saving…' : 'Save changes'}
						</button>
					) : (
						<button
							type="button"
							disabled={isPublishing || !article.id}
							onClick={async () => {
								if (isDirty) await saveArticle()
								await handlePublish()
								metaDialog.hide()
							}}
							className="flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isPublishing ? 'Publishing…' : 'Publish now'}
						</button>
					)}
					<button
						type="button"
						onClick={() => metaDialog.hide()}
						className="text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
					>
						{isPublished ? 'Cancel' : 'Keep editing'}
					</button>
				</div>
			</Ariakit.Dialog>

			<ArticleChartPickerDialog
				store={chartDialog}
				initialConfig={editingChart?.config ?? null}
				onInsert={handleChartSubmit}
			/>

			<EmbedPicker store={embedDialog} initialConfig={editingEmbed?.config ?? null} onInsert={handleEmbedSubmit} />

			<PeoplePanelDialog
				store={peoplePanelDialog}
				articleId={article.id ?? null}
				initialConfig={editingPanel?.config ?? null}
				onSubmit={handlePeoplePanelSubmit}
			/>
		</div>
	)
}
