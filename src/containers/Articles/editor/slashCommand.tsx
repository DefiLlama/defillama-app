import { Extension, type Editor, type Range } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { SlashCommandList, type SlashCommandListHandle } from './SlashCommandList'

export type SlashCommandItem = {
	id: string
	title: string
	description: string
	icon: string
	group: string
	keywords?: string[]
	action: (editor: Editor, range: Range) => void
}

const ALL_ITEMS: SlashCommandItem[] = [
	{
		id: 'h2',
		title: 'Heading 2',
		description: 'Major section heading',
		icon: 'H2',
		group: 'Structure',
		keywords: ['heading', 'h2', 'section'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
	},
	{
		id: 'h3',
		title: 'Heading 3',
		description: 'Subsection heading',
		icon: 'H3',
		group: 'Structure',
		keywords: ['heading', 'h3', 'subsection'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
	},
	{
		id: 'h4',
		title: 'Heading 4',
		description: 'Minor heading',
		icon: 'H4',
		group: 'Structure',
		keywords: ['heading', 'h4'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run()
	},
	{
		id: 'paragraph',
		title: 'Paragraph',
		description: 'Plain body text',
		icon: '¶',
		group: 'Structure',
		keywords: ['paragraph', 'text', 'body'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).setNode('paragraph').run()
	},
	{
		id: 'bullet',
		title: 'Bullet list',
		description: 'Unordered list',
		icon: '•',
		group: 'Lists',
		keywords: ['list', 'bullet', 'ul'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run()
	},
	{
		id: 'ordered',
		title: 'Numbered list',
		description: 'Ordered list',
		icon: '1.',
		group: 'Lists',
		keywords: ['list', 'ordered', 'numbered', 'ol'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run()
	},
	{
		id: 'task',
		title: 'Task list',
		description: 'Checklist with checkboxes',
		icon: '☑',
		group: 'Lists',
		keywords: ['task', 'todo', 'checklist', 'check'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run()
	},
	{
		id: 'quote',
		title: 'Blockquote',
		description: 'Pull quote',
		icon: '“',
		group: 'Blocks',
		keywords: ['quote', 'blockquote'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run()
	},
	{
		id: 'code',
		title: 'Code block',
		description: 'Syntax-highlighted code',
		icon: '</>',
		group: 'Blocks',
		keywords: ['code', 'snippet', 'pre'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
	},
	{
		id: 'divider',
		title: 'Divider',
		description: 'Horizontal rule',
		icon: '—',
		group: 'Blocks',
		keywords: ['divider', 'rule', 'hr', 'horizontal'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run()
	},
	{
		id: 'table',
		title: 'Table',
		description: '3×3 grid with header row',
		icon: '⊞',
		group: 'Blocks',
		keywords: ['table', 'grid', 'matrix', 'rows', 'columns'],
		action: (editor, range) =>
			editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
	},
	{
		id: 'embed',
		title: 'Embed',
		description: 'Tweet, YouTube, Medium, Mirror, Substack, or GitHub',
		icon: '◫',
		group: 'Blocks',
		keywords: [
			'embed',
			'twitter',
			'tweet',
			'youtube',
			'video',
			'medium',
			'mirror',
			'substack',
			'github',
			'gist',
			'article'
		],
		action: (editor, range) => {
			editor.chain().focus().deleteRange(range).run()
			document.dispatchEvent(new CustomEvent('article:open-embed-picker'))
		}
	},
	{
		id: 'image',
		title: 'Image',
		description: 'Upload an image from your device',
		icon: 'IMG',
		group: 'Blocks',
		keywords: ['image', 'photo', 'picture', 'upload', 'screenshot'],
		action: (editor, range) => {
			editor.chain().focus().deleteRange(range).run()
			document.dispatchEvent(new CustomEvent('article:trigger-image-upload'))
		}
	},
	{
		id: 'people',
		title: 'People panel',
		description: 'Image + bio cards (moderators, contributors, panelists)',
		icon: '◐',
		group: 'Custom',
		keywords: ['people', 'bio', 'panel', 'moderator', 'interviewee', 'speaker', 'contributor', 'about', 'team'],
		action: (editor, range) => {
			editor.chain().focus().deleteRange(range).run()
			document.dispatchEvent(new CustomEvent('article:open-people-panel-picker'))
		}
	},
	{
		id: 'callout-note',
		title: 'Callout · Note',
		description: 'Neutral aside',
		icon: 'ⓘ',
		group: 'Custom',
		keywords: ['callout', 'note', 'aside', 'info'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).insertCallout('note').run()
	},
	{
		id: 'callout-data',
		title: 'Callout · Data',
		description: 'Highlight a metric',
		icon: '◆',
		group: 'Custom',
		keywords: ['callout', 'data', 'metric'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).insertCallout('data').run()
	},
	{
		id: 'callout-warning',
		title: 'Callout · Warning',
		description: 'Risk or caveat',
		icon: '!',
		group: 'Custom',
		keywords: ['callout', 'warning', 'risk', 'caveat'],
		action: (editor, range) => editor.chain().focus().deleteRange(range).insertCallout('warning').run()
	},
	{
		id: 'citation',
		title: 'Citation',
		description: 'Numbered source reference',
		icon: '[1]',
		group: 'Custom',
		keywords: ['citation', 'cite', 'reference', 'source', 'footnote'],
		action: (editor, range) => {
			const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n')
			const existing = (text.match(/\[(\d+)\]/g) ?? []).map((m) => Number(m.slice(1, -1)))
			const next = existing.length ? Math.max(...existing) + 1 : 1
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertCitation({ id: String(next), label: String(next) })
				.run()
		}
	}
]

function filterItems(query: string): SlashCommandItem[] {
	const q = query.trim().toLowerCase()
	if (!q) return ALL_ITEMS
	return ALL_ITEMS.filter((item) => {
		if (item.title.toLowerCase().includes(q)) return true
		if (item.description.toLowerCase().includes(q)) return true
		return (item.keywords ?? []).some((k) => k.toLowerCase().includes(q))
	})
}

const SLASH_KEY = new PluginKey('articleSlashCommand')

type FloatingHost = {
	mount: (props: SuggestionProps<SlashCommandItem, SlashCommandItem>, items: SlashCommandItem[]) => void
	updateProps: (props: SuggestionProps<SlashCommandItem, SlashCommandItem>, items: SlashCommandItem[]) => void
	keyDown: (props: SuggestionKeyDownProps) => boolean
	destroy: () => void
}

function createFloatingHost(): FloatingHost {
	let renderer: ReactRenderer<SlashCommandListHandle> | null = null
	let wrapper: HTMLDivElement | null = null
	let onScroll: (() => void) | null = null

	const updatePosition = (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
		if (!wrapper) return
		const rect = props.clientRect?.()
		if (!rect) {
			wrapper.style.visibility = 'hidden'
			return
		}
		wrapper.style.visibility = 'visible'
		const popWidth = 288
		const margin = 8
		let left = rect.left
		if (left + popWidth + margin > window.innerWidth) left = window.innerWidth - popWidth - margin
		if (left < margin) left = margin
		const popHeightEstimate = 360
		let top = rect.bottom + 8
		if (top + popHeightEstimate > window.innerHeight - margin) {
			top = Math.max(margin, rect.top - popHeightEstimate - 8)
		}
		wrapper.style.left = `${left}px`
		wrapper.style.top = `${top}px`
	}

	return {
		mount(props, items) {
			wrapper = document.createElement('div')
			wrapper.style.position = 'fixed'
			wrapper.style.zIndex = '70'
			wrapper.style.visibility = 'hidden'
			document.body.appendChild(wrapper)
			renderer = new ReactRenderer(SlashCommandList, {
				props: {
					items,
					command: (item: SlashCommandItem) => props.command(item)
				},
				editor: props.editor
			})
			if (renderer.element) wrapper.appendChild(renderer.element)
			updatePosition(props)
			onScroll = () => updatePosition(props)
			window.addEventListener('scroll', onScroll, true)
			window.addEventListener('resize', onScroll)
		},
		updateProps(props, items) {
			renderer?.updateProps({
				items,
				command: (item: SlashCommandItem) => props.command(item)
			})
			updatePosition(props)
		},
		keyDown({ event }) {
			return renderer?.ref?.onKeyDown(event) ?? false
		},
		destroy() {
			if (onScroll) {
				window.removeEventListener('scroll', onScroll, true)
				window.removeEventListener('resize', onScroll)
				onScroll = null
			}
			renderer?.destroy()
			renderer = null
			wrapper?.remove()
			wrapper = null
		}
	}
}

export const ArticleSlashCommand = Extension.create({
	name: 'articleSlashCommand',

	addProseMirrorPlugins() {
		return [
			Suggestion<SlashCommandItem, SlashCommandItem>({
				editor: this.editor,
				pluginKey: SLASH_KEY,
				char: '/',
				startOfLine: true,
				allowSpaces: false,
				items: ({ query }) => filterItems(query),
				command: ({ editor, range, props }) => {
					props.action(editor, range)
				},
				render: () => {
					let host: FloatingHost | null = null

					return {
						onStart: (props) => {
							host = createFloatingHost()
							host.mount(props, props.items)
						},
						onUpdate: (props) => {
							host?.updateProps(props, props.items)
						},
						onKeyDown: (props) => {
							if (props.event.key === 'Escape') {
								host?.destroy()
								host = null
								return true
							}
							return host?.keyDown(props) ?? false
						},
						onExit: () => {
							host?.destroy()
							host = null
						}
					}
				}
			})
		]
	}
})
