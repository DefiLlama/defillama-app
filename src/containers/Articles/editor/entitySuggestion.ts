import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import type { ArticleEntitySuggestionItem } from '../entitySuggestions'
import { EntitySuggestionList, type EntitySuggestionListHandle } from './EntitySuggestionList'

type SuggestionResponse = { entities?: ArticleEntitySuggestionItem[] }

const ARTICLE_ENTITY_SUGGESTION_KEY = new PluginKey('articleEntitySuggestion')
const EMPTY_ITEMS: ArticleEntitySuggestionItem[] = []

async function fetchEntitySuggestions(query: string, signal?: AbortSignal): Promise<ArticleEntitySuggestionItem[]> {
	try {
		const response = await fetch(`/api/research/entities/search?q=${encodeURIComponent(query)}`, { signal })
		if (!response.ok) return EMPTY_ITEMS
		const data = (await response.json()) as SuggestionResponse
		return Array.isArray(data.entities) ? data.entities : EMPTY_ITEMS
	} catch (error) {
		if ((error as Error).name === 'AbortError') return EMPTY_ITEMS
		return EMPTY_ITEMS
	}
}

const RECENTS_KEY = 'articleEntityRecents'
const RECENTS_LIMIT = 5

function loadRecents(): ArticleEntitySuggestionItem[] {
	if (typeof window === 'undefined') return []
	try {
		const raw = window.localStorage.getItem(RECENTS_KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed
			.filter((i): i is ArticleEntitySuggestionItem => i && typeof i === 'object' && typeof i.id === 'string')
			.slice(0, RECENTS_LIMIT)
			.map((i) => ({ ...i, source: 'recent' as const }))
	} catch {
		return []
	}
}

function saveRecent(item: ArticleEntitySuggestionItem) {
	if (typeof window === 'undefined') return
	try {
		const current = loadRecents()
		const next = [item, ...current.filter((i) => i.id !== item.id)].slice(0, RECENTS_LIMIT)
		window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
	} catch {}
}

type FloatingHost = {
	mount: (
		props: SuggestionProps<ArticleEntitySuggestionItem, ArticleEntitySuggestionItem>,
		items: ArticleEntitySuggestionItem[],
		recents: ArticleEntitySuggestionItem[],
		loading: boolean
	) => void
	updateProps: (
		props: SuggestionProps<ArticleEntitySuggestionItem, ArticleEntitySuggestionItem>,
		items: ArticleEntitySuggestionItem[],
		recents: ArticleEntitySuggestionItem[],
		loading: boolean
	) => void
	keyDown: (props: SuggestionKeyDownProps) => boolean
	destroy: () => void
}

function createFloatingHost(): FloatingHost {
	let renderer: ReactRenderer<EntitySuggestionListHandle> | null = null
	let wrapper: HTMLDivElement | null = null
	let onScroll: (() => void) | null = null

	const updatePosition = (props: SuggestionProps<ArticleEntitySuggestionItem, ArticleEntitySuggestionItem>) => {
		if (!wrapper) return
		const rect = props.clientRect?.()
		if (!rect) {
			wrapper.style.visibility = 'hidden'
			return
		}
		wrapper.style.visibility = 'visible'

		const popWidth = 320
		const margin = 8
		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight
		let left = rect.left
		if (left + popWidth + margin > viewportWidth) left = viewportWidth - popWidth - margin
		if (left < margin) left = margin

		const popHeightEstimate = 320
		let top = rect.bottom + 8
		if (top + popHeightEstimate > viewportHeight - margin) {
			top = Math.max(margin, rect.top - popHeightEstimate - 8)
		}

		wrapper.style.left = `${left}px`
		wrapper.style.top = `${top}px`
	}

	return {
		mount(props, items, recents, loading) {
			wrapper = document.createElement('div')
			wrapper.style.position = 'fixed'
			wrapper.style.zIndex = '70'
			wrapper.style.visibility = 'hidden'
			document.body.appendChild(wrapper)

			renderer = new ReactRenderer(EntitySuggestionList, {
				props: {
					items,
					recents,
					query: props.query,
					loading,
					command: (item: ArticleEntitySuggestionItem) => props.command(item)
				},
				editor: props.editor
			})

			if (renderer.element) wrapper.appendChild(renderer.element)

			updatePosition(props)
			onScroll = () => updatePosition(props)
			window.addEventListener('scroll', onScroll, true)
			window.addEventListener('resize', onScroll)
		},
		updateProps(props, items, recents, loading) {
			renderer?.updateProps({
				items,
				recents,
				query: props.query,
				loading,
				command: (item: ArticleEntitySuggestionItem) => props.command(item)
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

export const ArticleEntitySuggestion = Extension.create({
	name: 'articleEntitySuggestion',

	addProseMirrorPlugins() {
		return [
			Suggestion<ArticleEntitySuggestionItem, ArticleEntitySuggestionItem>({
				editor: this.editor,
				pluginKey: ARTICLE_ENTITY_SUGGESTION_KEY,
				char: '@',
				allowedPrefixes: [' ', '\n', '('],
				decorationClass: 'article-entity-suggestion-query',
				items: ({ query }) => fetchEntitySuggestions(query),
				command: ({ editor, range, props }) => {
					saveRecent(props)
					editor
						.chain()
						.focus()
						.deleteRange(range)
						.insertContent([
							{
								type: 'text',
								text: props.label,
								marks: [
									{
										type: 'entityLink',
										attrs: {
											entityType: props.entityType,
											slug: props.slug,
											label: props.label,
											route: props.route,
											snapshot: props.preview ?? null
										}
									}
								]
							},
							{ type: 'text', text: ' ' }
						])
						.run()
				},
				render: () => {
					let host: FloatingHost | null = null
					let latestController: AbortController | null = null
					let latestProps: SuggestionProps<ArticleEntitySuggestionItem, ArticleEntitySuggestionItem> | null = null
					let latestItems: ArticleEntitySuggestionItem[] = []
					let recents: ArticleEntitySuggestionItem[] = []
					let loading = false

					const refetch = (props: SuggestionProps<ArticleEntitySuggestionItem, ArticleEntitySuggestionItem>) => {
						latestController?.abort()
						latestController = new AbortController()
						loading = true
						host?.updateProps(props, latestItems, recents, loading)
						fetchEntitySuggestions(props.query, latestController.signal).then((items) => {
							latestItems = items
							loading = false
							if (latestProps) host?.updateProps(latestProps, items, recents, loading)
						})
					}

					return {
						onStart: (props) => {
							latestProps = props
							latestItems = props.items
							recents = loadRecents()
							host = createFloatingHost()
							host.mount(props, latestItems, recents, false)
							refetch(props)
						},
						onUpdate: (props) => {
							latestProps = props
							host?.updateProps(props, latestItems, recents, loading)
							refetch(props)
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
							latestController?.abort()
							host?.destroy()
							host = null
							latestProps = null
						}
					}
				}
			})
		]
	}
})
