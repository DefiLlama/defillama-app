import { Mark, mergeAttributes, Node } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Underline from '@tiptap/extension-underline'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'
import { useEffect, useRef, useState } from 'react'
import { getArticleEntityRoute } from '../entityLinks'
import type { ArticleCalloutTone, ArticleChartConfig, ArticleEntityType } from '../types'
import { ArticleEmbed } from './EmbedNode'
import { ArticleEntitySuggestion } from './entitySuggestion'
import { ArticleSlashCommand } from './slashCommand'

const lowlight = createLowlight(common)

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		entityLink: {
			setEntityLink: (attrs: {
				entityType: ArticleEntityType
				slug: string
				label?: string
				route?: string
			}) => ReturnType
			unsetEntityLink: () => ReturnType
		}
		defillamaChart: {
			insertDefillamaChart: (config: ArticleChartConfig) => ReturnType
		}
		callout: {
			insertCallout: (tone: ArticleCalloutTone) => ReturnType
		}
		citation: {
			insertCitation: (attrs: { id: string; label?: string; url?: string; title?: string }) => ReturnType
		}
	}
}

const calloutToneStyles: Record<ArticleCalloutTone, { wrap: string; tone: string }> = {
	note: {
		wrap: 'border-(--cards-border) bg-(--cards-bg)',
		tone: 'text-(--text-tertiary)'
	},
	data: {
		wrap: 'border-(--link-text)/40 bg-(--link-button)',
		tone: 'text-(--link-text)'
	},
	warning: {
		wrap: 'border-[#d89b2a] bg-[#fff8e6] text-[#4d3606] dark:bg-[#30230b] dark:text-[#f4d28e]',
		tone: 'text-[#a17317] dark:text-[#f4d28e]'
	}
}

function ChartNodeView({ node, selected, deleteNode, getPos }: NodeViewProps) {
	const config = node.attrs.config as ArticleChartConfig
	const entityNames = config.entities.map((e) => e.name).join(' vs ')
	const title = `${entityNames} · ${config.chartType}`
	const rangeLabel = config.range && config.range !== 'all' ? config.range : 'all time'
	const subtitle = `${config.entities.length === 1 ? config.entities[0].entityType : `${config.entities.length} series`} · ${rangeLabel}${config.logScale ? ' · log' : ''}${config.annotations?.length ? ` · ${config.annotations.length} marker${config.annotations.length === 1 ? '' : 's'}` : ''}`
	const handleEdit = () => {
		const pos = typeof getPos === 'function' ? getPos() : null
		if (typeof pos !== 'number') return
		document.dispatchEvent(new CustomEvent('article:edit-chart', { detail: { config, pos } }))
	}
	return (
		<NodeViewWrapper
			data-article-chart
			className={`my-4 overflow-hidden rounded-md border bg-(--cards-bg) ${
				selected ? 'border-(--link-text)' : 'border-(--cards-border)'
			}`}
		>
			<div className="flex items-start justify-between gap-3 px-4 py-3">
				<div className="min-w-0">
					<div className="text-xs text-(--text-tertiary)">DefiLlama chart</div>
					<div className="mt-1 truncate text-sm font-medium text-(--text-primary)">{title}</div>
					<div className="mt-0.5 text-xs text-(--text-tertiary) capitalize">{subtitle}</div>
					{config.caption ? <p className="mt-2 text-sm text-(--text-secondary)">{config.caption}</p> : null}
				</div>
				<div
					contentEditable={false}
					className="flex shrink-0 items-center gap-1.5"
					onMouseDown={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						onMouseDown={(e) => {
							e.preventDefault()
							e.stopPropagation()
						}}
						onClick={(e) => {
							e.stopPropagation()
							handleEdit()
						}}
						className="rounded-md border border-(--cards-border) px-2 py-1 text-xs text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						Edit
					</button>
					<button
						type="button"
						onMouseDown={(e) => {
							e.preventDefault()
							e.stopPropagation()
						}}
						onClick={(e) => {
							e.stopPropagation()
							deleteNode()
						}}
						className="rounded-md border border-(--cards-border) px-2 py-1 text-xs text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						Remove
					</button>
				</div>
			</div>
		</NodeViewWrapper>
	)
}

function CalloutNodeView({ node, updateAttributes }: NodeViewProps) {
	const tone = (node.attrs.tone as ArticleCalloutTone) || 'note'
	const styles = calloutToneStyles[tone] ?? calloutToneStyles.note
	return (
		<NodeViewWrapper className={`my-4 rounded-md border p-4 ${styles.wrap}`}>
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className={`text-xs font-medium capitalize ${styles.tone}`}>{tone}</span>
				<div className="flex rounded border border-(--cards-border) p-0.5">
					{(['note', 'data', 'warning'] as ArticleCalloutTone[]).map((value) => {
						const active = value === tone
						return (
							<button
								key={value}
								type="button"
								onClick={() => updateAttributes({ tone: value })}
								className={`rounded px-2 py-0.5 text-xs capitalize transition-colors ${
									active
										? 'bg-(--link-button) text-(--link-text)'
										: 'text-(--text-tertiary) hover:text-(--text-primary)'
								}`}
							>
								{value}
							</button>
						)
					})}
				</div>
			</div>
			<NodeViewContent className="article-callout-content min-h-6" />
		</NodeViewWrapper>
	)
}

function CitationNodeView({ node, selected, deleteNode, updateAttributes, editor }: NodeViewProps) {
	const label = node.attrs.label || node.attrs.id
	const url = (node.attrs.url as string) || ''
	const title = (node.attrs.title as string) || ''
	const [open, setOpen] = useState(false)
	const popRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		if (!open) return
		const handler = (event: MouseEvent) => {
			const target = event.target as unknown as globalThis.Node | null
			if (popRef.current && target && !popRef.current.contains(target)) setOpen(false)
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [open])

	const editable = editor?.isEditable !== false
	return (
		<NodeViewWrapper
			as="span"
			className={`relative mx-0.5 inline-flex items-center gap-1 rounded-[3px] border align-baseline font-jetbrains text-[10px] leading-none ${
				selected
					? 'border-(--link-text) bg-(--link-button)'
					: 'border-(--cards-border) bg-(--link-button)/60 text-(--link-text)'
			}`}
		>
			<button type="button" onClick={() => editable && setOpen((o) => !o)} className="px-1 py-0.5 tracking-wider">
				[{label}]
			</button>
			{selected && editable ? (
				<button
					type="button"
					className="border-l border-(--cards-border) px-1 py-0.5 text-(--text-tertiary) hover:text-(--text-primary)"
					onClick={deleteNode}
					aria-label="Remove citation"
				>
					×
				</button>
			) : null}
			{open && editable ? (
				<div
					ref={popRef}
					contentEditable={false}
					className="absolute top-full left-0 z-50 mt-1 grid w-72 gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2.5 font-sans shadow-xl"
				>
					<div className="flex items-center gap-1.5">
						<label className="w-12 shrink-0 text-[10px] tracking-wider text-(--text-tertiary) uppercase">Label</label>
						<input
							value={(node.attrs.label as string) || ''}
							onChange={(e) => updateAttributes({ label: e.target.value, id: e.target.value || node.attrs.id })}
							className="flex-1 rounded border border-(--form-control-border) bg-(--app-bg) px-1.5 py-1 text-xs text-(--text-primary) focus:border-(--link-text) focus:outline-none"
						/>
					</div>
					<div className="flex items-center gap-1.5">
						<label className="w-12 shrink-0 text-[10px] tracking-wider text-(--text-tertiary) uppercase">URL</label>
						<input
							value={url}
							onChange={(e) => updateAttributes({ url: e.target.value })}
							placeholder="https://…"
							className="flex-1 rounded border border-(--form-control-border) bg-(--app-bg) px-1.5 py-1 text-xs text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
						/>
					</div>
					<div className="flex items-center gap-1.5">
						<label className="w-12 shrink-0 text-[10px] tracking-wider text-(--text-tertiary) uppercase">Title</label>
						<input
							value={title}
							onChange={(e) => updateAttributes({ title: e.target.value })}
							placeholder="Source title"
							className="flex-1 rounded border border-(--form-control-border) bg-(--app-bg) px-1.5 py-1 text-xs text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
						/>
					</div>
				</div>
			) : null}
		</NodeViewWrapper>
	)
}

export const EntityLink = Mark.create({
	name: 'entityLink',
	priority: 1000,
	keepOnSplit: false,
	excludes: 'link',
	inclusive: false,

	addAttributes() {
		return {
			entityType: { default: null },
			slug: { default: null },
			label: { default: null, rendered: false },
			route: { default: null, rendered: false },
			snapshot: { default: null, rendered: false }
		}
	},

	parseHTML() {
		return [{ tag: 'a[data-article-entity-link]' }]
	},

	renderHTML({ HTMLAttributes }) {
		const { entityType, slug, route, label, snapshot, ...rest } = HTMLAttributes as Record<string, unknown>
		void label
		void snapshot
		const href =
			(route as string) ||
			(entityType && slug ? getArticleEntityRoute(entityType as ArticleEntityType, slug as string) : undefined)
		return [
			'a',
			mergeAttributes(rest, {
				href,
				'data-article-entity-link': 'true',
				'data-entity-type': entityType,
				'data-entity-slug': slug
			}),
			0
		]
	},

	addCommands() {
		return {
			setEntityLink:
				(attrs) =>
				({ commands }) => {
					const route = attrs.route || getArticleEntityRoute(attrs.entityType, attrs.slug)
					return commands.setMark(this.name, { ...attrs, route })
				},
			unsetEntityLink:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name)
		}
	}
})

export const DefillamaChart = Node.create({
	name: 'defillamaChart',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			config: { default: null }
		}
	},

	parseHTML() {
		return [{ tag: 'div[data-defillama-chart]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-defillama-chart': 'true',
				'data-config': JSON.stringify(HTMLAttributes.config ?? null)
			})
		]
	},

	addNodeView() {
		return ReactNodeViewRenderer(ChartNodeView)
	},

	addCommands() {
		return {
			insertDefillamaChart:
				(config) =>
				({ commands }) =>
					commands.insertContent({ type: this.name, attrs: { config } })
		}
	}
})

export const Callout = Node.create({
	name: 'callout',
	group: 'block',
	content: 'block+',
	defining: true,

	addAttributes() {
		return {
			tone: { default: 'note' }
		}
	},

	parseHTML() {
		return [{ tag: 'aside[data-article-callout]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return ['aside', mergeAttributes(HTMLAttributes, { 'data-article-callout': 'true' }), 0]
	},

	addNodeView() {
		return ReactNodeViewRenderer(CalloutNodeView)
	},

	addCommands() {
		return {
			insertCallout:
				(tone) =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs: { tone },
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Add context or caveats here.' }] }]
					})
		}
	}
})

export const Citation = Node.create({
	name: 'citation',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			id: { default: null },
			label: { default: null },
			url: { default: null },
			title: { default: null }
		}
	},

	parseHTML() {
		return [{ tag: 'span[data-article-citation]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes, { 'data-article-citation': 'true' })]
	},

	addNodeView() {
		return ReactNodeViewRenderer(CitationNodeView)
	},

	addCommands() {
		return {
			insertCitation:
				(attrs) =>
				({ commands }) =>
					commands.insertContent({ type: this.name, attrs: { label: attrs.label || attrs.id, ...attrs } })
		}
	}
})

export function createArticleEditorExtensions() {
	return [
		StarterKit.configure({
			heading: { levels: [2, 3, 4] },
			link: false,
			codeBlock: false
		}),
		Link.configure({
			openOnClick: false,
			autolink: true,
			defaultProtocol: 'https'
		}),
		Underline,
		Highlight.configure({ multicolor: false }),
		TaskList,
		TaskItem.configure({ nested: true }),
		Table.configure({ resizable: true, HTMLAttributes: { 'data-article-table': 'true' } }),
		TableRow,
		TableHeader,
		TableCell,
		CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
		Placeholder.configure({
			placeholder: ({ node }) => {
				if (node.type.name === 'heading') return 'Section heading'
				return "Write research, cite sources, link data, or insert a chart. Press '/' for commands."
			}
		}),
		EntityLink,
		ArticleEntitySuggestion,
		ArticleSlashCommand,
		DefillamaChart,
		ArticleEmbed,
		Callout,
		Citation
	]
}
