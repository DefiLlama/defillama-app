import * as Ariakit from '@ariakit/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEditor } from '@tiptap/react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { canManageResearchArticle } from '~/containers/Articles/ArticlesAccessGate'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import {
	ArticleApiError,
	createArticle,
	deleteArticle,
	discardPendingEdits,
	getOwnedArticle,
	publishArticle,
	unpublishArticle,
	updateArticle as updateRemoteArticle
} from '../api'
import { validateArticleChartConfig } from '../chartAdapters'
import {
	applyPendingToLocalArticle,
	createEmptyLocalArticle,
	isDraftPlaceholderSlug,
	normalizeLocalArticleDocument,
	validateLocalArticleForPublish
} from '../document'
import { ResearchLoader } from '../ResearchLoader'
import type { ArticleCalloutTone, ArticleChartConfig, ArticleEmbedConfig, LocalArticleDocument } from '../types'
import { ARTICLE_SECTION_SLUGS } from '../types'
import { type UploadResult, useImageUpload } from '../upload/useImageUpload'
import { ArticleChartPickerDialog } from './ArticleChartPicker'
import { ArticleCoverImageEditor } from './ArticleCoverImageEditor'
import { ArticleEditorCanvas } from './ArticleEditorCanvas'
import { useActiveEntityLink, useEditorFlags, type BlockItem, type MarkButton } from './ArticleEditorControls'
import { CoverDetailsDialog, DeleteArticleDialog } from './ArticleEditorDialogs'
import { ArticleEditorHeader } from './ArticleEditorHeader'
import { articleQueryKey, formatRelative, sanitizeLinkHref, slugFromTitle, useTicker } from './ArticleEditorUtils'
import { ArticleMetaDialog } from './ArticleMetaDialog'
import { ArticleTitleFields } from './ArticleTitleFields'
import { EmbedPicker } from './EmbedPicker'
import { createArticleEditorExtensions } from './extensions'
import { triggerInlineImagePicker, type ArticleImageUploadFn } from './nodes/ArticleImage'
import type { ArticlePeoplePanelConfig } from './peoplePanel'
import { PeoplePanelDialog } from './PeoplePanelDialog'
import { RevisionHistoryDrawer } from './RevisionHistoryDrawer'
import { useArticleCollaborators } from './useArticleCollaborators'

export function ArticleEditorClient({ articleId }: { articleId?: string }) {
	const router = useRouter()
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const queryClient = useQueryClient()
	const [article, setArticle] = useState<LocalArticleDocument>(() => createEmptyLocalArticle())
	const [isDirty, setIsDirty] = useState(false)
	const [savedAt, setSavedAt] = useState<string | null>(null)
	const [wordCount, setWordCount] = useState(0)
	const [linkEdit, setLinkEdit] = useState<{ url: string; newTab: boolean } | null>(null)
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
	const deleteDialog = Ariakit.useDialogStore()
	const coverDetailsDialog = Ariakit.useDialogStore()
	const [editingChart, setEditingChart] = useState<{ config: ArticleChartConfig; pos: number } | null>(null)
	const [editingEmbed, setEditingEmbed] = useState<{ config: ArticleEmbedConfig; pos: number } | null>(null)
	const [editingPanel, setEditingPanel] = useState<{ config: ArticlePeoplePanelConfig; pos: number } | null>(null)
	const [saveError, setSaveError] = useState(false)
	const [slugEditing, setSlugEditing] = useState(false)
	const [slugDraft, setSlugDraft] = useState('')
	const [publishErrors, setPublishErrors] = useState<Record<string, string>>({})
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const autoCreatingRef = useRef(false)
	const hydratedArticleIdRef = useRef<string | null>(null)
	const saveRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(async () => {})
	const articleIdRef = useRef<string | undefined>(article.id)
	articleIdRef.current = article.id

	const { uploadFile: uploadInlineImageRaw } = useImageUpload({
		scope: 'article-inline',
		articleId: article.id ?? null
	})
	const { uploadWithToast: uploadCoverImage, isUploading: isUploadingCover } = useImageUpload({
		scope: 'article-cover',
		articleId: article.id ?? null
	})
	const coverFileInputRef = useRef<HTMLInputElement>(null)
	const [coverHovered, setCoverHovered] = useState(false)

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
	const activeEntity = useActiveEntityLink(editor)
	const ownedArticleQueryKey = articleQueryKey(articleId)
	const ownedArticleQuery = useQuery({
		queryKey: ownedArticleQueryKey,
		queryFn: () => getOwnedArticle(articleId!, authorizedFetch),
		enabled: !!editor && !loaders.userLoading && isAuthenticated && !!articleId,
		retry: false,
		refetchOnWindowFocus: false
	})
	const createArticleMutation = useMutation({
		mutationFn: () => createArticle(createEmptyLocalArticle(), authorizedFetch),
		onSuccess: (saved) => {
			void router.replace(`/research/edit/${saved.id}`)
		},
		onError: (error) => {
			autoCreatingRef.current = false
			toast.error(error instanceof Error ? error.message : 'Failed to create draft')
		}
	})
	const saveArticleMutation = useMutation({
		mutationFn: ({
			targetArticleId,
			articlePayload
		}: {
			targetArticleId?: string
			articlePayload: LocalArticleDocument
		}) =>
			targetArticleId
				? updateRemoteArticle(targetArticleId, articlePayload, authorizedFetch)
				: createArticle(articlePayload, authorizedFetch)
	})
	const setOwnedArticleCache = (saved: LocalArticleDocument) => {
		if (saved.id) queryClient.setQueryData(articleQueryKey(saved.id), saved)
	}
	const isLoading = loaders.userLoading || ownedArticleQuery.isLoading || createArticleMutation.isPending
	const isSaving = saveArticleMutation.isPending

	useEffect(() => {
		if (!editor) return
		if (loaders.userLoading) return
		if (!isAuthenticated) {
			return
		}
		if (!articleId) {
			if (autoCreatingRef.current) return
			autoCreatingRef.current = true
			createArticleMutation.mutate()
		}
	}, [articleId, createArticleMutation, editor, isAuthenticated, loaders.userLoading])

	useEffect(() => {
		hydratedArticleIdRef.current = null
	}, [articleId])

	useEffect(() => {
		if (!editor || !ownedArticleQuery.data) return
		if (hydratedArticleIdRef.current === ownedArticleQuery.data.id) return
		hydratedArticleIdRef.current = ownedArticleQuery.data.id
		const merged = applyPendingToLocalArticle(ownedArticleQuery.data, ownedArticleQuery.data.pending)
		setArticle(merged)
		queueMicrotask(() => {
			if (editor.isDestroyed) return
			editor.commands.setContent(merged.contentJson, { emitUpdate: false })
		})
		setIsDirty(false)
		setSaveError(false)
		const text = merged.plainText || ''
		setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
		setSavedAt(merged.pendingUpdatedAt ?? merged.updatedAt)
	}, [editor, ownedArticleQuery.data])

	useEffect(() => {
		if (ownedArticleQuery.error) {
			toast.error(
				ownedArticleQuery.error instanceof Error ? ownedArticleQuery.error.message : 'Failed to load research'
			)
		}
	}, [ownedArticleQuery.error])

	const updateArticle = useCallback(
		<K extends keyof LocalArticleDocument>(key: K, value: LocalArticleDocument[K]) => {
			setArticle((current) => ({
				...current,
				[key]: value,
				...(key === 'title' && isDraftPlaceholderSlug(current.slug) ? { slug: slugFromTitle(String(value)) } : {})
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
		if (!opts.silent) setSaveError(false)
		try {
			const normalized = normalizeLocalArticleDocument({ ...article, contentJson: editor.getJSON() })
			if (normalized.ok === false) throw new Error(normalized.error)
			const saved = await saveArticleMutation.mutateAsync({
				targetArticleId: article.id,
				articlePayload: normalized.value
			})
			const merged = applyPendingToLocalArticle(saved, saved.pending)
			setArticle(merged)
			setOwnedArticleCache(saved)
			setSavedAt(merged.pendingUpdatedAt ?? merged.updatedAt)
			setSaveError(false)
			if (!article.id) {
				void router.replace(`/research/edit/${saved.id}`)
			}
			setIsDirty(false)
		} catch (error) {
			setSaveError(true)
			if (!opts.silent) toast.error(error instanceof Error ? error.message : 'Failed to save research')
		}
	}

	const openLinkEditor = useCallback(() => {
		if (!editor) return
		const attrs = editor.getAttributes('link')
		const previous = (attrs.href as string | undefined) ?? ''
		const previousTarget = attrs.target as string | undefined
		setLinkEdit({ url: previous, newTab: previousTarget !== '_self' })
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

	const applyLink = (raw: string, newTab: boolean) => {
		if (!editor) return
		const url = raw.trim()
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run()
			setLinkEdit(null)
			return
		}
		const href = sanitizeLinkHref(url)
		if (!href) {
			toast.error('That link is not allowed')
			return
		}
		editor
			.chain()
			.focus()
			.extendMarkRange('link')
			.setLink({ href, target: newTab ? '_blank' : '_self' })
			.run()
		setLinkEdit(null)
	}

	const unsetActiveEntityLink = useCallback(() => {
		if (!editor) return
		editor.chain().focus().extendMarkRange('entityLink').unsetEntityLink().run()
	}, [editor])

	const openActiveEntityLink = useCallback(() => {
		if (!activeEntity?.route) return
		window.open(activeEntity.route, '_blank', 'noopener,noreferrer')
	}, [activeEntity?.route])

	const changeActiveEntityLink = useCallback(() => {
		if (!editor) return
		const label = activeEntity?.label ?? ''
		editor
			.chain()
			.focus()
			.extendMarkRange('entityLink')
			.deleteSelection()
			.insertContent(' @' + label)
			.run()
	}, [editor, activeEntity?.label])

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
		const hasInflight = () => isSaving || createArticleMutation.isPending
		const handler = (nextUrl: string) => {
			if (nextUrl === router.asPath) return
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
				debounceRef.current = null
				void saveRef.current({ silent: true })
			}
			if (!isDirty && !hasInflight()) return
			const message = hasInflight()
				? 'A save is still in progress. Leave anyway?'
				: 'You have unsaved changes. Leave anyway?'
			if (typeof window !== 'undefined' && !window.confirm(message)) {
				router.events.emit('routeChangeError', new Error('routeChange aborted'), nextUrl, { shallow: false })
				throw new Error('routeChange aborted to preserve unsaved changes')
			}
		}
		router.events.on('routeChangeStart', handler)
		return () => router.events.off('routeChangeStart', handler)
	}, [isDirty, isSaving, createArticleMutation.isPending, router])

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [])

	useEffect(() => {
		const handler = (event: Event) => {
			const detail = (event as CustomEvent<{ config: ArticleChartConfig; pos: number }>).detail
			if (!detail) return
			const normalized = validateArticleChartConfig(detail.config)
			if (!normalized) return
			setEditingChart({ config: normalized, pos: detail.pos })
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

	const [historyOpen, setHistoryOpen] = useState(false)
	const publishMutation = useMutation({
		mutationFn: (targetArticleId: string) => publishArticle(targetArticleId, authorizedFetch),
		onSuccess: (saved) => setOwnedArticleCache(saved)
	})
	const unpublishMutation = useMutation({
		mutationFn: (targetArticleId: string) => unpublishArticle(targetArticleId, authorizedFetch),
		onSuccess: (saved) => setOwnedArticleCache(saved)
	})
	const discardPendingMutation = useMutation({
		mutationFn: (targetArticleId: string) => discardPendingEdits(targetArticleId, authorizedFetch),
		onSuccess: (saved) => setOwnedArticleCache(saved)
	})
	const deleteArticleMutation = useMutation({
		mutationFn: (targetArticleId: string) => deleteArticle(targetArticleId, authorizedFetch),
		onSuccess: () => {
			void router.replace('/research')
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed to delete')
		}
	})
	const isPublishing = publishMutation.isPending || unpublishMutation.isPending
	const isDiscarding = discardPendingMutation.isPending
	const {
		collaboratorAdding,
		collaboratorEmail,
		collaboratorError,
		collaborators,
		collaboratorsLoadError,
		collaboratorsLoading,
		handleAddCollaborator,
		handleRemoveCollaborator,
		handleToggleHidden,
		handleTransferOwnership,
		setCollaboratorEmail,
		setCollaboratorError
	} = useArticleCollaborators({
		articleId: article.id,
		authorizedFetch,
		queryClient,
		setArticle,
		setOwnedArticleCache
	})

	const flushPendingSave = useCallback(async () => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current)
			debounceRef.current = null
			await saveRef.current({ silent: true })
		} else if (isDirty) {
			await saveRef.current({ silent: true })
		}
	}, [isDirty])

	const handlePublish = async (): Promise<boolean> => {
		if (!article.id) {
			toast.error('Save the draft before publishing')
			return false
		}
		const localErrors = validateLocalArticleForPublish(article)
		if (localErrors.length > 0) {
			setPublishErrors(Object.fromEntries(localErrors.map((e) => [e.field, e.message])))
			toast.error('Fix required fields before publishing')
			return false
		}
		setPublishErrors({})
		try {
			await flushPendingSave()
			const saved = await publishMutation.mutateAsync(article.id)
			const merged = applyPendingToLocalArticle(saved, saved.pending)
			setArticle(merged)
			setSavedAt(merged.updatedAt)
			toast.success(article.status === 'published' ? 'Update published' : 'Published')
			return true
		} catch (error) {
			if (error instanceof ArticleApiError && error.validationErrors?.length) {
				setPublishErrors(Object.fromEntries(error.validationErrors.map((e) => [e.field, e.message])))
				toast.error(error.message)
			} else {
				toast.error(error instanceof Error ? error.message : 'Failed to publish')
			}
			return false
		}
	}

	const handleUnpublish = async () => {
		if (!article.id) return
		try {
			const saved = await unpublishMutation.mutateAsync(article.id)
			const merged = applyPendingToLocalArticle(saved, saved.pending)
			setArticle(merged)
			editor?.commands.setContent(merged.contentJson, { emitUpdate: false })
			setSavedAt(merged.updatedAt)
			toast.success('Moved to drafts')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to unpublish')
		}
	}

	const handleDiscardPending = async () => {
		if (!article.id) return
		if (!confirm('Discard pending changes? The live version will not be modified.')) return
		try {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
				debounceRef.current = null
			}
			const saved = await discardPendingMutation.mutateAsync(article.id)
			const merged = applyPendingToLocalArticle(saved, saved.pending)
			setArticle(merged)
			editor?.commands.setContent(merged.contentJson, { emitUpdate: false })
			setSavedAt(merged.updatedAt)
			setIsDirty(false)
			toast.success('Pending changes discarded')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to discard changes')
		}
	}

	const handleRevisionRestored = useCallback(
		(saved: LocalArticleDocument) => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
				debounceRef.current = null
			}
			const merged = applyPendingToLocalArticle(saved, saved.pending)
			setArticle(merged)
			editor?.commands.setContent(merged.contentJson, { emitUpdate: false })
			setSavedAt(merged.pendingUpdatedAt ?? merged.updatedAt)
			setIsDirty(false)
			setSaveError(false)
		},
		[editor]
	)

	const handleCoverFile = async (file: File | null | undefined) => {
		if (!file) return
		try {
			const result = await uploadCoverImage(file)
			updateArticle('coverImage', {
				...(article.coverImage ?? {}),
				url: result.url,
				alt: article.coverImage?.alt || article.title
			})
		} catch {
			// surfaced via toast
		} finally {
			if (coverFileInputRef.current) coverFileInputRef.current.value = ''
		}
	}

	const openCoverPicker = () => coverFileInputRef.current?.click()

	const updateCoverField = (key: 'headline' | 'caption' | 'credit' | 'copyright', value: string) => {
		if (!article.coverImage) return
		updateArticle('coverImage', {
			...article.coverImage,
			[key]: value
		})
	}

	const handleDeleteArticle = () => {
		if (!article.id) return
		deleteDialog.show()
	}

	const confirmDeleteArticle = () => {
		if (!article.id) return
		deleteArticleMutation.mutate(article.id, {
			onSettled: () => deleteDialog.hide()
		})
	}

	const isOwner = canManageResearchArticle(article)
	const isCollaborator = article.viewerRole === 'collaborator'

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

	const isPublished = article.status === 'published'
	const hasPendingEdits = isPublished && article.pending != null
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
	const articleViewHref = article.section
		? `/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}`
		: '/research'

	return (
		<div className="article-editor-shell relative mx-auto w-full max-w-[760px] animate-fadein px-4 pb-32 sm:px-6">
			<ArticleEditorHeader
				article={article}
				articleViewHref={articleViewHref}
				beginSlugEdit={beginSlugEdit}
				cancelSlugEdit={cancelSlugEdit}
				commitSlugEdit={commitSlugEdit}
				deletePending={deleteArticleMutation.isPending}
				handleDeleteArticle={handleDeleteArticle}
				handleDiscardPending={handleDiscardPending}
				handlePublish={handlePublish}
				handleUnpublish={handleUnpublish}
				hasPendingEdits={hasPendingEdits}
				isDiscarding={isDiscarding}
				isOwner={isOwner}
				isPublished={isPublished}
				isPublishing={isPublishing}
				onOpenHistory={() => setHistoryOpen(true)}
				onOpenMeta={() => metaDialog.show()}
				pillDot={pillDot}
				pillLabel={pillLabel}
				pillState={pillState}
				saveArticle={saveArticle}
				savedLabel={savedLabel}
				setSlugDraft={setSlugDraft}
				slugDraft={slugDraft}
				slugEditing={slugEditing}
			/>

			<ArticleTitleFields article={article} updateArticle={updateArticle} />

			<ArticleCoverImageEditor
				article={article}
				coverFileInputRef={coverFileInputRef}
				coverHovered={coverHovered}
				handleCoverFile={handleCoverFile}
				isUploadingCover={isUploadingCover}
				onOpenCoverDetails={() => coverDetailsDialog.show()}
				openCoverPicker={openCoverPicker}
				publishError={publishErrors.coverImage}
				setCoverHovered={setCoverHovered}
				updateArticle={updateArticle}
			/>

			<ArticleEditorCanvas
				activeEntity={activeEntity}
				applyLink={applyLink}
				blockItems={blockItems}
				changeActiveEntityLink={changeActiveEntityLink}
				editor={editor}
				flags={flags}
				handleLinkRail={handleLinkRail}
				insertCallout={insertCallout}
				insertCitation={insertCitation}
				linkEdit={linkEdit}
				linkInputRef={linkInputRef}
				markButtons={markButtons}
				onOpenChartPicker={() => chartDialog.show()}
				onOpenEmbedPicker={() => {
					setEditingEmbed(null)
					embedDialog.show()
				}}
				openActiveEntityLink={openActiveEntityLink}
				openLinkEditor={openLinkEditor}
				readMins={readMins}
				setLinkEdit={setLinkEdit}
				unsetActiveEntityLink={unsetActiveEntityLink}
				wordCount={wordCount}
			/>

			<ArticleMetaDialog
				article={article}
				collaboratorAdding={collaboratorAdding}
				collaboratorEmail={collaboratorEmail}
				collaboratorError={collaboratorError}
				collaborators={collaborators}
				collaboratorsLoadError={collaboratorsLoadError}
				collaboratorsLoading={collaboratorsLoading}
				handleAddCollaborator={handleAddCollaborator}
				handlePublish={handlePublish}
				handleRemoveCollaborator={handleRemoveCollaborator}
				handleToggleHidden={handleToggleHidden}
				handleTransferOwnership={handleTransferOwnership}
				hasPendingEdits={hasPendingEdits}
				isCollaborator={isCollaborator}
				isDirty={isDirty}
				isDiscarding={isDiscarding}
				isOwner={isOwner}
				isPublished={isPublished}
				isPublishing={isPublishing}
				isSaving={isSaving}
				publishErrors={publishErrors}
				saveArticle={saveArticle}
				setCollaboratorEmail={setCollaboratorEmail}
				setCollaboratorError={setCollaboratorError}
				store={metaDialog}
				updateArticle={updateArticle}
			/>

			<CoverDetailsDialog
				article={article}
				publishErrors={publishErrors}
				store={coverDetailsDialog}
				updateCoverField={updateCoverField}
			/>

			<DeleteArticleDialog
				confirmDeleteArticle={confirmDeleteArticle}
				isPending={deleteArticleMutation.isPending}
				isPublished={isPublished}
				store={deleteDialog}
				title={article.title}
			/>

			{article.id && historyOpen ? (
				<RevisionHistoryDrawer
					key={article.id}
					onClose={() => setHistoryOpen(false)}
					articleId={article.id}
					authorizedFetch={authorizedFetch}
					onRestored={handleRevisionRestored}
				/>
			) : null}

			{chartDialogOpen ? (
				<ArticleChartPickerDialog
					key={editingChart ? `edit-chart-${editingChart.pos}` : 'new-chart'}
					store={chartDialog}
					initialConfig={editingChart?.config ?? null}
					onInsert={handleChartSubmit}
				/>
			) : null}

			{embedDialogOpen ? (
				<EmbedPicker
					key={editingEmbed ? `edit-embed-${editingEmbed.pos}` : 'new-embed'}
					store={embedDialog}
					initialConfig={editingEmbed?.config ?? null}
					onInsert={handleEmbedSubmit}
				/>
			) : null}

			{peoplePanelDialogOpen ? (
				<PeoplePanelDialog
					key={editingPanel ? `edit-people-panel-${editingPanel.pos}` : 'new-people-panel'}
					store={peoplePanelDialog}
					articleId={article.id ?? null}
					initialConfig={editingPanel?.config ?? null}
					onSubmit={handlePeoplePanelSubmit}
				/>
			) : null}
		</div>
	)
}
