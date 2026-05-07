import { Node, mergeAttributes, type Editor } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { UploadResult } from '../../upload/useImageUpload'
import { ArticleImageNodeView } from './ArticleImageNodeView'

export type ArticleImageWidthMode = 'default' | 'wide' | 'full'

export type ArticleImageUploadFn = (file: File, placeholderId: string) => Promise<UploadResult>

export type ArticleImageOptions = {
	uploadRef: { current: ArticleImageUploadFn | null } | null
	articleIdRef: { current: string | null | undefined } | null
	onMissingArticleId?: (() => void) | null
}

const ALLOWED_INLINE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function genPlaceholderId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
	return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function fileFromClipboard(event: ClipboardEvent): File | null {
	const files = Array.from(event.clipboardData?.files ?? [])
	const fromFiles = files.find((f) => ALLOWED_INLINE_MIMES.has(f.type))
	if (fromFiles) return fromFiles
	const items = Array.from(event.clipboardData?.items ?? [])
	for (const item of items) {
		if (item.kind === 'file' && ALLOWED_INLINE_MIMES.has(item.type)) {
			const file = item.getAsFile()
			if (file) return file
		}
	}
	return null
}

function fileFromDrop(event: DragEvent): File | null {
	const files = Array.from(event.dataTransfer?.files ?? [])
	return files.find((f) => ALLOWED_INLINE_MIMES.has(f.type)) ?? null
}

function altFromFile(file: File) {
	const base = file.name?.trim() ?? ''
	if (!base) return ''
	return base
		.replace(/\.[^.]+$/, '')
		.replace(/[-_]+/g, ' ')
		.slice(0, 120)
}

function pickInlineImageFile(): Promise<File | null> {
	return new Promise((resolve) => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/png,image/jpeg,image/webp,image/gif'
		input.style.position = 'fixed'
		input.style.left = '-9999px'
		const cleanup = () => {
			input.remove()
		}
		input.addEventListener('change', () => {
			const file = input.files?.[0] ?? null
			cleanup()
			resolve(file)
		})
		input.addEventListener('cancel', () => {
			cleanup()
			resolve(null)
		})
		document.body.appendChild(input)
		input.click()
	})
}

export async function runInlineImageUpload(
	editor: Editor,
	uploadRef: { current: ArticleImageUploadFn | null },
	file: File,
	pos?: number
): Promise<void> {
	const upload = uploadRef.current
	if (!upload) return
	const placeholderId = genPlaceholderId()
	editor.chain().focus().insertArticleImagePlaceholder({ placeholderId, pos }).run()
	try {
		const result = await upload(file, placeholderId)
		editor
			.chain()
			.finalizeArticleImage({
				placeholderId,
				imageId: result.id,
				src: result.url,
				width: result.width,
				height: result.height,
				alt: altFromFile(file)
			})
			.run()
	} catch {
		editor.chain().failArticleImage(placeholderId).run()
	}
}

export async function triggerInlineImagePicker(
	editor: Editor,
	uploadRef: { current: ArticleImageUploadFn | null },
	pos?: number
): Promise<void> {
	if (!uploadRef.current) return
	const file = await pickInlineImageFile()
	if (!file) return
	await runInlineImageUpload(editor, uploadRef, file, pos)
}

export type ArticleImageAttrs = {
	imageId: string | null
	src: string | null
	alt: string
	caption: string
	width: number | null
	height: number | null
	widthMode: ArticleImageWidthMode
	uploading: boolean
	placeholderId: string | null
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		articleImage: {
			insertArticleImagePlaceholder: (args: { placeholderId: string; pos?: number }) => ReturnType
			finalizeArticleImage: (args: {
				placeholderId: string
				imageId: string
				src: string
				width: number
				height: number
				alt?: string
			}) => ReturnType
			failArticleImage: (placeholderId: string) => ReturnType
		}
	}
}

const VALID_WIDTH_MODES: ReadonlySet<ArticleImageWidthMode> = new Set(['default', 'wide', 'full'])

function normalizeWidthMode(value: unknown): ArticleImageWidthMode {
	return typeof value === 'string' && VALID_WIDTH_MODES.has(value as ArticleImageWidthMode)
		? (value as ArticleImageWidthMode)
		: 'default'
}

export const ArticleImage = Node.create<ArticleImageOptions>({
	name: 'articleImage',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addOptions() {
		return {
			uploadRef: null,
			articleIdRef: null,
			onMissingArticleId: null
		}
	},

	addProseMirrorPlugins() {
		const editor = this.editor
		const opts = this.options
		return [
			new Plugin({
				props: {
					handlePaste: (_view, event) => {
						const uploadRef = opts.uploadRef
						if (!uploadRef?.current) return false
						const file = fileFromClipboard(event as unknown as ClipboardEvent)
						if (!file) return false
						event.preventDefault()
						if (!opts.articleIdRef?.current) {
							opts.onMissingArticleId?.()
							return true
						}
						void runInlineImageUpload(editor, uploadRef, file)
						return true
					},
					handleDrop: (view, event, _slice, moved) => {
						if (moved) return false
						const uploadRef = opts.uploadRef
						if (!uploadRef?.current) return false
						const file = fileFromDrop(event as unknown as DragEvent)
						if (!file) return false
						event.preventDefault()
						if (!opts.articleIdRef?.current) {
							opts.onMissingArticleId?.()
							return true
						}
						const dragEvent = event as unknown as DragEvent
						const coords = view.posAtCoords({ left: dragEvent.clientX, top: dragEvent.clientY })
						const pos = coords?.pos
						void runInlineImageUpload(editor, uploadRef, file, pos)
						return true
					}
				}
			})
		]
	},

	addAttributes() {
		return {
			imageId: { default: null },
			src: { default: null },
			alt: { default: '' },
			caption: { default: '' },
			width: { default: null },
			height: { default: null },
			widthMode: {
				default: 'default',
				parseHTML: (el) => normalizeWidthMode(el.getAttribute('data-width-mode')),
				renderHTML: (attrs) => ({ 'data-width-mode': normalizeWidthMode(attrs.widthMode) })
			},
			uploading: { default: false, rendered: false },
			placeholderId: { default: null, rendered: false }
		}
	},

	parseHTML() {
		return [{ tag: 'figure[data-article-image]' }]
	},

	renderHTML({ node, HTMLAttributes }) {
		const { src, alt, caption } = node.attrs as ArticleImageAttrs
		const widthMode = normalizeWidthMode(node.attrs.widthMode)
		const figureAttrs = mergeAttributes(HTMLAttributes, {
			'data-article-image': 'true',
			'data-width-mode': widthMode
		})
		const img: ['img', Record<string, string>] = [
			'img',
			{
				src: src ?? '',
				alt: alt ?? '',
				loading: 'lazy',
				decoding: 'async'
			}
		]
		if (caption) {
			return ['figure', figureAttrs, img, ['figcaption', {}, caption]]
		}
		return ['figure', figureAttrs, img]
	},

	addNodeView() {
		return ReactNodeViewRenderer(ArticleImageNodeView)
	},

	addCommands() {
		return {
			insertArticleImagePlaceholder:
				({ placeholderId, pos }) =>
				({ chain }) => {
					const node = {
						type: this.name,
						attrs: {
							imageId: null,
							src: null,
							alt: '',
							caption: '',
							width: null,
							height: null,
							widthMode: 'default',
							uploading: true,
							placeholderId
						}
					}
					if (typeof pos === 'number') {
						return chain().insertContentAt(pos, node).run()
					}
					return chain().insertContent(node).run()
				},

			finalizeArticleImage:
				({ placeholderId, imageId, src, width, height, alt }) =>
				({ tr, state, dispatch }) => {
					let found = false
					state.doc.descendants((node, p) => {
						if (found) return false
						if (node.type.name === 'articleImage' && node.attrs.placeholderId === placeholderId) {
							if (dispatch) {
								tr.setNodeMarkup(p, undefined, {
									...node.attrs,
									imageId,
									src,
									width,
									height,
									alt: alt ?? node.attrs.alt ?? '',
									uploading: false,
									placeholderId: null
								})
							}
							found = true
							return false
						}
						return true
					})
					return found
				},

			failArticleImage:
				(placeholderId) =>
				({ tr, state, dispatch }) => {
					let found = false
					state.doc.descendants((node, p) => {
						if (found) return false
						if (node.type.name === 'articleImage' && node.attrs.placeholderId === placeholderId) {
							if (dispatch) tr.delete(p, p + node.nodeSize)
							found = true
							return false
						}
						return true
					})
					return found
				}
		}
	}
})
