import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { CapabilityChips } from '~/containers/LlamaAI/components/input/CapabilityChips'
import { EntityComboboxPopover } from '~/containers/LlamaAI/components/input/EntityCombobox'
import { DragOverlay, ImageUpload, ImageUploadButton } from '~/containers/LlamaAI/components/input/ImageUpload'
import { InputTextarea } from '~/containers/LlamaAI/components/input/InputTextarea'
import { MobileToolsPopover } from '~/containers/LlamaAI/components/input/MobileToolsPopover'
import { ModeToggle } from '~/containers/LlamaAI/components/input/ModeToggle'
import { SubmitButton } from '~/containers/LlamaAI/components/input/SubmitButton'
import { PastedContentModal } from '~/containers/LlamaAI/components/PastedContentModal'
import { useEntityCombobox } from '~/containers/LlamaAI/hooks/useEntityCombobox'
import { fileToBase64, useImageUpload } from '~/containers/LlamaAI/hooks/useImageUpload'
import type { QueuedPromptRequest } from '~/containers/LlamaAI/streamState'
import type { AgenticAnswerMode, FactCheckedUsage, ResearchUsage } from '~/containers/LlamaAI/types'
import { setInputSize, syncHighlightScroll } from '~/containers/LlamaAI/utils/scrollUtils'
import { highlightWord } from '~/containers/LlamaAI/utils/textUtils'
import { useMedia } from '~/hooks/useMedia'
import type { FormSubmitEvent } from '~/types/forms'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const PASTE_TO_FILE_THRESHOLD = 1500

// Browser object URLs are only needed for local previews, so clean them up after use.
function revokeImageUrls(images: Array<{ url: string }>) {
	for (let i = 0; i < images.length; i++) {
		URL.revokeObjectURL(images[i].url)
	}
}

interface PromptInputProps {
	handleSubmit: (
		prompt: string,
		preResolvedEntities?: Array<{ term: string; slug: string; type?: string }>,
		images?: Array<{ data: string; mimeType: string; filename?: string; isPasted?: boolean }>,
		pageContext?: undefined,
		isSuggestedQuestion?: boolean
	) => boolean | Promise<boolean>
	draftValue: string
	setDraftValue: (value: string) => void
	enqueuePrompt: (request: QueuedPromptRequest) => void
	promptInputRef: RefObject<HTMLTextAreaElement | null>
	isPending: boolean
	handleStopRequest?: () => void
	isStreaming?: boolean
	placeholder: string
	restoreRequest?: {
		key: number
		text: string
		entities?: Array<{ term: string; slug: string; type?: string }>
	} | null
	mode: AgenticAnswerMode
	setMode: (mode: AgenticAnswerMode) => void
	researchUsage?: ResearchUsage | null
	factCheckedUsage?: FactCheckedUsage | null
	onFactCheckedGated?: () => void
	droppedFiles?: File[] | null
	clearDroppedFiles?: () => void
	externalDragging?: boolean
	onOpenAlerts?: () => void
	quotedText?: string | null
	onClearQuotedText?: () => void
	enterToSend: boolean
	walkthroughActive?: boolean
}

const trackSubmit = () => {
	trackUmamiEvent('llamaai-prompt-submit')
}

interface PendingSelection {
	selectionStart: number
	selectionEnd: number
	focus?: boolean
}

export function QueuedPromptStack({ queuedPrompts }: { queuedPrompts: QueuedPromptRequest[] }) {
	if (queuedPrompts.length === 0) return null

	const backCardCount = Math.min(Math.max(queuedPrompts.length - 1, 0), 2)
	const firstPrompt = queuedPrompts[0].prompt || 'Image prompt'

	return (
		<div className="pointer-events-none relative pb-2" aria-live="polite" aria-label={`Queued prompt: ${firstPrompt}`}>
			{backCardCount === 2 ? (
				<div className="pointer-events-none absolute inset-0 translate-y-2 scale-x-[0.92] rounded-md border border-[#e6e6e6] bg-(--app-bg) opacity-60 dark:border-[#222324]" />
			) : null}
			{backCardCount >= 1 ? (
				<div className="pointer-events-none absolute inset-0 translate-y-1 scale-x-[0.96] rounded-md border border-[#e6e6e6] bg-(--app-bg) opacity-75 dark:border-[#222324]" />
			) : null}
			<div className="relative z-1 flex items-center gap-2 rounded-md border border-[#e6e6e6] bg-(--app-bg) px-3 py-2.5 text-sm text-black dark:border-[#222324] dark:text-white">
				<Icon name="arrow-right-to-line" height={14} width={14} className="shrink-0 text-[#666] dark:text-[#919296]" />
				<p className="min-w-0 flex-1 truncate">{firstPrompt}</p>
				{queuedPrompts.length > 1 ? (
					<span className="shrink-0 text-xs font-medium text-[#666] dark:text-[#919296]">
						+{queuedPrompts.length - 1}
					</span>
				) : null}
			</div>
		</div>
	)
}

export function PromptInput({
	handleSubmit,
	draftValue,
	setDraftValue,
	enqueuePrompt,
	promptInputRef,
	isPending,
	handleStopRequest,
	isStreaming,
	placeholder,
	restoreRequest,
	mode,
	setMode,
	researchUsage,
	factCheckedUsage,
	onFactCheckedGated,
	droppedFiles,
	clearDroppedFiles,
	externalDragging,
	onOpenAlerts,
	quotedText,
	onClearQuotedText,
	enterToSend,
	walkthroughActive
}: PromptInputProps) {
	const value = draftValue
	const [submitError, setSubmitError] = useState<string | null>(null)
	const highlightRef = useRef<HTMLDivElement>(null)
	const pendingSelectionRef = useRef<PendingSelection | null>(null)
	const valueRef = useRef(value)
	const isSuggestedRef = useRef(false)
	const shiftHeldRef = useRef(false)

	useEffect(() => {
		const onDown = (e: KeyboardEvent) => {
			if (e.key === 'Shift') shiftHeldRef.current = true
		}
		const onUp = (e: KeyboardEvent) => {
			if (e.key === 'Shift') shiftHeldRef.current = false
		}
		const onBlur = () => {
			shiftHeldRef.current = false
		}
		window.addEventListener('keydown', onDown)
		window.addEventListener('keyup', onUp)
		window.addEventListener('blur', onBlur)
		return () => {
			window.removeEventListener('keydown', onDown)
			window.removeEventListener('keyup', onUp)
			window.removeEventListener('blur', onBlur)
		}
	}, [])

	// Route all programmatic prompt edits through one helper so caret restoration stays consistent.
	const applyPromptEdit = useCallback(
		({
			nextValue,
			selectionStart,
			selectionEnd,
			focus = false
		}: {
			nextValue: string
			selectionStart?: number
			selectionEnd?: number
			focus?: boolean
		}) => {
			valueRef.current = nextValue
			pendingSelectionRef.current =
				selectionStart == null
					? null
					: {
							selectionStart,
							selectionEnd: selectionEnd ?? selectionStart,
							focus
						}
			setDraftValue(nextValue)
		},
		[setDraftValue]
	)

	// Image upload handling
	const imageUpload = useImageUpload({ droppedFiles, clearDroppedFiles })

	// Entity combobox handling
	const entityCombobox = useEntityCombobox({
		promptInputRef,
		currentValue: value,
		applyPromptEdit
	})
	const { clearSearch, restoreEntities } = entityCombobox

	// Mobile placeholder handling
	const isMobile = useMedia('(max-width: 640px)')
	const mobilePlaceholder = placeholder.replace('Type @ to add a protocol, chain or stablecoin', '')
	const finalPlaceholder = isMobile ? mobilePlaceholder : placeholder
	const sanitizedHighlightedHtml = highlightWord(
		value,
		entityCombobox.selectedEntities.map(({ term }) => term)
	)

	// Resize the textarea and restore the intended selection after controlled prompt updates.
	useLayoutEffect(() => {
		const textarea = promptInputRef.current
		if (!textarea) return

		if (value) {
			setInputSize(promptInputRef, highlightRef, isMobile ? 3 : 5)
		} else {
			textarea.style.height = ''
			textarea.style.overflowY = 'hidden'
			if (highlightRef.current) {
				highlightRef.current.style.height = ''
			}
		}

		const pendingSelection = pendingSelectionRef.current
		if (!pendingSelection) return

		if (pendingSelection.focus) {
			textarea.focus()
		}

		try {
			textarea.setSelectionRange(pendingSelection.selectionStart, pendingSelection.selectionEnd)
		} catch {}
		pendingSelectionRef.current = null
	}, [value, promptInputRef, isMobile])

	useEffect(() => {
		valueRef.current = value
	}, [value])

	// Handle restore request (e.g., failed submission retry)
	useEffect(() => {
		if (!restoreRequest) return
		if (value.trim().length > 0) return

		const { text, entities } = restoreRequest
		let cancelled = false

		queueMicrotask(() => {
			if (cancelled) return

			restoreEntities(entities)
			clearSearch()
			applyPromptEdit({
				nextValue: text,
				selectionStart: text.length,
				selectionEnd: text.length
			})
		})

		return () => {
			cancelled = true
		}
	}, [restoreRequest, value, restoreEntities, clearSearch, applyPromptEdit])

	// Focus input after external drop
	useEffect(() => {
		if (droppedFiles && droppedFiles.length > 0) {
			promptInputRef.current?.focus()
		}
	}, [droppedFiles, promptInputRef])

	const resetInput = (imagesToRevoke?: Array<{ url: string }>) => {
		applyPromptEdit({
			nextValue: '',
			selectionStart: 0,
			selectionEnd: 0
		})
		imageUpload.setPreviewImage(null)
		if (imagesToRevoke && imagesToRevoke.length > 0) {
			imageUpload.clearImages(false)
			revokeImageUrls(imagesToRevoke)
		} else {
			imageUpload.clearImages(true)
		}
		entityCombobox.resetCombobox()
	}

	const clearSubmitError = useCallback(() => {
		setSubmitError((current) => (current ? null : current))
	}, [])

	const prepareImagesForSubmit = useCallback(async (imagesToSend: Array<{ file: File; isPasted?: boolean }>) => {
		const imagePromises: Promise<{ data: string; mimeType: string; filename: string; isPasted?: boolean }>[] = []
		for (let i = 0; i < imagesToSend.length; i++) {
			const file = imagesToSend[i].file
			imagePromises.push(
				fileToBase64(file).then((data) => ({
					data,
					mimeType: file.type,
					filename: file.name,
					...(imagesToSend[i].isPasted ? { isPasted: true } : {})
				}))
			)
		}
		return Promise.all(imagePromises)
	}, [])

	const shouldResetSubmittedDraft = useCallback(
		(promptValue: string, imagesToSend: Array<{ id: string }>) => {
			const currentValue = valueRef.current
			const currentIds = imageUpload.getSelectedImageIds()
			if (currentValue !== promptValue) return false

			if (imagesToSend.length !== currentIds.length) return false

			for (let index = 0; index < imagesToSend.length; index++) {
				if (imagesToSend[index].id !== currentIds[index]) return false
			}

			return true
		},
		[imageUpload]
	)

	// Submit the prompt plus any selected entities/images, then clear the local composer state.
	const submitForm = async (promptValue: string) => {
		if (!promptValue.trim() && imageUpload.selectedImages.length === 0) return

		trackSubmit()
		const finalEntities = entityCombobox.getFinalEntities()
		const imagesToSend = [...imageUpload.selectedImages]
		const hasImages = imagesToSend.length > 0
		const isSuggested = isSuggestedRef.current
		isSuggestedRef.current = false

		if (isStreaming) {
			if (hasImages) {
				try {
					const images = await prepareImagesForSubmit(imagesToSend)
					enqueuePrompt({
						prompt: promptValue.trim(),
						entities: finalEntities.length ? finalEntities : undefined,
						images,
						isSuggestedQuestion: isSuggested || undefined
					})
					setSubmitError(null)
					if (shouldResetSubmittedDraft(promptValue, imagesToSend)) {
						resetInput(imagesToSend)
					}
				} catch (error) {
					console.error('Failed to queue prompt', error)
					setSubmitError('Failed to queue your prompt. Please try again.')
				}
				return
			}

			enqueuePrompt({
				prompt: promptValue.trim(),
				entities: finalEntities.length ? finalEntities : undefined,
				isSuggestedQuestion: isSuggested || undefined
			})
			setSubmitError(null)
			resetInput()
			return
		}

		if (hasImages) {
			try {
				const images = await prepareImagesForSubmit(imagesToSend)
				const accepted = await Promise.resolve(
					handleSubmit(promptValue, finalEntities, images, undefined, isSuggested || undefined)
				)
				setSubmitError(null)
				if (accepted && shouldResetSubmittedDraft(promptValue, imagesToSend)) {
					resetInput(imagesToSend)
				}
				return
			} catch (error) {
				console.error('Submission failed', error)
				setSubmitError('Failed to submit your prompt. Please try again.')
			}
			return
		}

		try {
			const accepted = await Promise.resolve(
				handleSubmit(promptValue, finalEntities, undefined, undefined, isSuggested || undefined)
			)
			setSubmitError(null)
			if (accepted) {
				resetInput()
			}
		} catch (error) {
			console.error('Submission failed', error)
			setSubmitError('Failed to submit your prompt. Please try again.')
		}
	}

	const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Ariakit's composite proxy forwards Enter to the active @ suggestion, swallowing
		// the textarea's native newline. Stop capture propagation so the configured newline shortcut
		// keeps the textarea behavior before combobox handlers see the event.
		if (event.key === 'Enter' && event.shiftKey === enterToSend) {
			event.stopPropagation()
		}
	}

	// Let the combobox own navigation keys first, then submit on the configured shortcut.
	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const shouldSubmit = event.key === 'Enter' && event.shiftKey !== enterToSend

		// First let entity combobox handle the event
		if (!shouldSubmit) {
			entityCombobox.handleKeyDown(event)
		}
		if (event.defaultPrevented) return

		// Handle enter for submission
		if (shouldSubmit && !entityCombobox.hasRenderedItems && !event.nativeEvent.isComposing) {
			event.preventDefault()
			void submitForm(value)
		}
	}

	// Keep the mirrored highlight layer and combobox trigger detection in sync with textarea edits.
	const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		clearSubmitError()
		applyPromptEdit({ nextValue: event.target.value })
		entityCombobox.handleChange(event.target)
	}

	// Reposition the suggestion popover and highlighted overlay whenever the textarea scrolls.
	const handleScroll = () => {
		syncHighlightScroll(promptInputRef, highlightRef)
		entityCombobox.handleScroll()
	}

	// Route native form submits through the same submit helper used by the Enter key path.
	const handleFormSubmit = (e: FormSubmitEvent) => {
		e.preventDefault()
		void submitForm(value)
	}

	// Clicking empty space inside the composer should still focus the textarea.
	const handleFormPointerDown = (event: React.PointerEvent<HTMLFormElement>) => {
		const target = event.target as HTMLElement
		if (target.closest('button, textarea, input, [role="option"]')) return
		requestAnimationFrame(() => {
			promptInputRef.current?.focus()
		})
	}

	const handleImageRemove = (idx: number) => {
		clearSubmitError()
		imageUpload.removeImage(idx)
	}

	const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		clearSubmitError()
		imageUpload.handleImageSelect(event)
	}

	const handlePaste = (event: React.ClipboardEvent<Element>) => {
		clearSubmitError()
		const data = event.clipboardData
		if (!data) return

		const hasFile = Array.from(data.items).some((item) => item.kind === 'file')
		if (hasFile) {
			imageUpload.handlePaste(event)
			return
		}

		const text = data.getData('text/plain')
		if (!text || text.length < PASTE_TO_FILE_THRESHOLD || shiftHeldRef.current) return

		if (imageUpload.addPastedText(text)) {
			event.preventDefault()
		}
	}

	const handleDrop = (event: React.DragEvent<HTMLFormElement>) => {
		clearSubmitError()
		imageUpload.handleDrop(event)
	}

	return (
		<form
			className="relative flex w-full flex-col gap-4 rounded-lg border border-[#e6e6e6] bg-(--app-bg) p-4 has-[textarea:focus]:border-(--old-blue) dark:border-[#222324]"
			onDragEnter={imageUpload.handleDragEnter}
			onDragLeave={imageUpload.handleDragLeave}
			onDragOver={(e) => e.preventDefault()}
			onDrop={handleDrop}
			onSubmit={handleFormSubmit}
			onPointerDown={handleFormPointerDown}
		>
			<DragOverlay isDragging={imageUpload.isDragging} externalDragging={externalDragging} />

			<ImageUpload
				selectedImages={imageUpload.selectedImages}
				previewImage={imageUpload.previewImage}
				setPreviewImage={imageUpload.setPreviewImage}
				openPastedPreview={imageUpload.setPastedPreview}
				removeImage={handleImageRemove}
				fileInputRef={imageUpload.fileInputRef}
				handleImageSelect={handleImageSelect}
			/>

			<PastedContentModal preview={imageUpload.pastedPreview} onClose={() => imageUpload.setPastedPreview(null)} />

			{quotedText ? (
				<div className="flex items-center gap-2.5 rounded-md border-l-2 border-[#2172e5]/40 bg-[#2172e5]/4 py-2 pr-2 pl-3 dark:border-[#4190f7]/40 dark:bg-[#4190f7]/4">
					<svg
						className="size-3.5 shrink-0 -scale-x-100 text-[#2172e5]/50 dark:text-[#4190f7]/50"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="9 14 4 9 9 4" />
						<path d="M20 20v-7a4 4 0 0 0-4-4H4" />
					</svg>
					<p className="min-w-0 flex-1 truncate text-[13px] text-[#333] dark:text-[#bbb]">{quotedText}</p>
					<button
						type="button"
						onClick={onClearQuotedText}
						aria-label="Clear quoted text"
						className="flex size-5 shrink-0 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-black/5 hover:text-[#333] dark:text-[#555] dark:hover:bg-white/5 dark:hover:text-white"
					>
						<svg
							className="size-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
						>
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			) : null}

			<InputTextarea
				combobox={entityCombobox.combobox}
				promptInputRef={promptInputRef}
				highlightRef={highlightRef}
				value={value}
				sanitizedHighlightedHtml={sanitizedHighlightedHtml}
				placeholder={finalPlaceholder}
				isPending={isPending}
				isStreaming={isStreaming}
				onScroll={handleScroll}
				onChange={handleChange}
				onKeyDownCapture={handleKeyDownCapture}
				onKeyDown={handleKeyDown}
				onPaste={handlePaste}
				onCompositionStart={entityCombobox.handleCompositionStart}
				onCompositionEnd={entityCombobox.handleCompositionEnd}
			/>

			<EntityComboboxPopover
				combobox={entityCombobox.combobox}
				promptInputRef={promptInputRef}
				matches={entityCombobox.matches}
				hasMatches={entityCombobox.hasMatches}
				isTriggerOnly={entityCombobox.isTriggerOnly}
				isLoading={entityCombobox.isLoading}
				isFetching={entityCombobox.isFetching}
				onItemClick={entityCombobox.selectEntity}
			/>

			{submitError ? <p className="text-xs text-red-700 dark:text-red-300">{submitError}</p> : null}

			<div className="flex items-center justify-between gap-4 p-0">
				<div className="hidden items-center gap-2 sm:flex">
					<ModeToggle
						mode={mode}
						setMode={setMode}
						researchUsage={researchUsage}
						factCheckedUsage={factCheckedUsage}
						onFactCheckedGated={onFactCheckedGated}
					/>
					<CapabilityChips
						key={isPending || isStreaming ? 'capability-chips-disabled' : 'capability-chips-enabled'}
						onPromptSelect={(prompt, categoryKey) => {
							if (categoryKey === 'research') {
								setMode('research')
							}
							isSuggestedRef.current = true
							applyPromptEdit({ nextValue: prompt, selectionStart: prompt.length, focus: true })
						}}
						isPending={isPending}
						isStreaming={isStreaming}
					/>
					{onOpenAlerts ? (
						<Tooltip
							content="Manage Alerts"
							render={<button type="button" onClick={onOpenAlerts} data-walkthrough="alerts-button" />}
							className="flex size-7 items-center justify-center rounded-md bg-amber-500/12 text-amber-500 hover:bg-amber-500 hover:text-white"
						>
							<Icon name="calendar-plus" height={14} width={14} />
							<span className="sr-only">Manage Alerts</span>
						</Tooltip>
					) : null}
				</div>
				<MobileToolsPopover
					mode={mode}
					setMode={setMode}
					researchUsage={researchUsage}
					factCheckedUsage={factCheckedUsage}
					onFactCheckedGated={onFactCheckedGated}
					onOpenAlerts={onOpenAlerts}
					onPromptSelect={(prompt, categoryKey) => {
						if (categoryKey === 'research') {
							setMode('research')
						}
						isSuggestedRef.current = true
						applyPromptEdit({ nextValue: prompt, selectionStart: prompt.length, focus: true })
					}}
					onImageUploadClick={imageUpload.openFilePicker}
					isPending={isPending}
					isStreaming={isStreaming}
					walkthroughActive={walkthroughActive}
				/>
				<div className="flex items-center gap-2">
					<span className="max-sm:hidden" data-walkthrough="image-upload">
						<ImageUploadButton onClick={imageUpload.openFilePicker} />
					</span>
					<SubmitButton
						isStreaming={isStreaming}
						isPending={isPending}
						hasValue={value.trim().length > 0 || imageUpload.selectedImages.length > 0}
						onStop={handleStopRequest}
					/>
				</div>
			</div>
		</form>
	)
}
