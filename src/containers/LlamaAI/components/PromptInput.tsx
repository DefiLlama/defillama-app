import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState
} from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { CapabilityChips } from '~/containers/LlamaAI/components/input/CapabilityChips'
import { EntityComboboxPopover } from '~/containers/LlamaAI/components/input/EntityCombobox'
import { DragOverlay, ImageUpload, ImageUploadButton } from '~/containers/LlamaAI/components/input/ImageUpload'
import { InputTextarea } from '~/containers/LlamaAI/components/input/InputTextarea'
import { ModeToggle, type ResearchUsage } from '~/containers/LlamaAI/components/input/ModeToggle'
import { SubmitButton } from '~/containers/LlamaAI/components/input/SubmitButton'
import { useEntityCombobox } from '~/containers/LlamaAI/hooks/useEntityCombobox'
import { fileToBase64, useImageUpload } from '~/containers/LlamaAI/hooks/useImageUpload'
import { setInputSize, syncHighlightScroll } from '~/containers/LlamaAI/utils/scrollUtils'
import { highlightWord } from '~/containers/LlamaAI/utils/textUtils'
import { useMedia } from '~/hooks/useMedia'
import type { FormSubmitEvent } from '~/types/forms'
import { trackUmamiEvent } from '~/utils/analytics/umami'

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
		images?: Array<{ data: string; mimeType: string; filename?: string }>
	) => void | Promise<void>
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
	isResearchMode: boolean
	setIsResearchMode: Dispatch<SetStateAction<boolean>>
	researchUsage?: ResearchUsage | null
	droppedFiles?: File[] | null
	clearDroppedFiles?: () => void
	externalDragging?: boolean
	onOpenAlerts?: () => void
	quotedText?: string | null
	onClearQuotedText?: () => void
}

const trackSubmit = () => {
	trackUmamiEvent('llamaai-prompt-submit')
}

interface PendingSelection {
	selectionStart: number
	selectionEnd: number
	focus?: boolean
}

export function PromptInput({
	handleSubmit,
	promptInputRef,
	isPending,
	handleStopRequest,
	isStreaming,
	placeholder,
	restoreRequest,
	isResearchMode,
	setIsResearchMode,
	researchUsage,
	droppedFiles,
	clearDroppedFiles,
	externalDragging,
	onOpenAlerts,
	quotedText,
	onClearQuotedText
}: PromptInputProps) {
	const [value, setValue] = useState('')
	const [submitError, setSubmitError] = useState<string | null>(null)
	const highlightRef = useRef<HTMLDivElement>(null)
	const pendingSelectionRef = useRef<PendingSelection | null>(null)
	const valueRef = useRef(value)
	const selectedImageUrlsRef = useRef<string[]>([])

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
			pendingSelectionRef.current =
				selectionStart == null
					? null
					: {
							selectionStart,
							selectionEnd: selectionEnd ?? selectionStart,
							focus
						}
			setValue(nextValue)
		},
		[]
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

		setInputSize(promptInputRef, highlightRef)

		const pendingSelection = pendingSelectionRef.current
		if (!pendingSelection) return

		if (pendingSelection.focus) {
			textarea.focus()
		}

		try {
			textarea.setSelectionRange(pendingSelection.selectionStart, pendingSelection.selectionEnd)
		} catch {}
		pendingSelectionRef.current = null
	}, [value, promptInputRef])

	useEffect(() => {
		valueRef.current = value
	}, [value])

	useEffect(() => {
		selectedImageUrlsRef.current = imageUpload.selectedImages.map(({ url }) => url)
	}, [imageUpload.selectedImages])

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

	const prepareImagesForSubmit = useCallback(async (imagesToSend: Array<{ file: File; url: string }>) => {
		const imagePromises: Promise<{ data: string; mimeType: string; filename: string }>[] = []
		for (let i = 0; i < imagesToSend.length; i++) {
			const file = imagesToSend[i].file
			imagePromises.push(
				fileToBase64(file).then((data) => ({
					data,
					mimeType: file.type,
					filename: file.name
				}))
			)
		}
		return Promise.all(imagePromises)
	}, [])

	const shouldResetSubmittedDraft = useCallback((promptValue: string, imagesToSend: Array<{ url: string }>) => {
		const currentValue = valueRef.current
		const currentUrls = [...selectedImageUrlsRef.current]
		if (currentValue !== promptValue) return false

		const submittedUrls = imagesToSend.map(({ url }) => url)
		if (submittedUrls.length !== currentUrls.length) return false

		for (let index = 0; index < submittedUrls.length; index++) {
			if (submittedUrls[index] !== currentUrls[index]) return false
		}

		return true
	}, [])

	// Submit the prompt plus any selected entities/images, then clear the local composer state.
	const submitForm = async (promptValue: string) => {
		if (!promptValue.trim()) return

		trackSubmit()
		const finalEntities = entityCombobox.getFinalEntities()
		const imagesToSend = [...imageUpload.selectedImages]
		const hasImages = imagesToSend.length > 0

		if (hasImages) {
			try {
				const images = await prepareImagesForSubmit(imagesToSend)
				await Promise.resolve(handleSubmit(promptValue, finalEntities, images))
				setSubmitError(null)
				if (shouldResetSubmittedDraft(promptValue, imagesToSend)) {
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
			await Promise.resolve(handleSubmit(promptValue, finalEntities))
			setSubmitError(null)
			resetInput()
		} catch (error) {
			console.error('Submission failed', error)
			setSubmitError('Failed to submit your prompt. Please try again.')
		}
	}

	// Let the combobox own navigation keys first, then submit on Enter when no suggestion is active.
	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// First let entity combobox handle the event
		entityCombobox.handleKeyDown(event)
		if (event.defaultPrevented) return

		// Handle enter for submission
		if (event.key === 'Enter' && !event.shiftKey && !entityCombobox.hasRenderedItems) {
			event.preventDefault()
			if (isStreaming) return
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
		imageUpload.handlePaste(event)
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
				removeImage={handleImageRemove}
				fileInputRef={imageUpload.fileInputRef}
				handleImageSelect={handleImageSelect}
			/>

			{quotedText ? (
				<div className="flex items-center gap-2.5 rounded-md border-l-2 border-[#2172e5]/40 bg-[#2172e5]/4 py-2 pr-2 pl-3 dark:border-[#4190f7]/40 dark:bg-[#4190f7]/4">
					<svg
						className="h-3.5 w-3.5 shrink-0 -scale-x-100 text-[#2172e5]/50 dark:text-[#4190f7]/50"
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
						className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-black/5 hover:text-[#333] dark:text-[#555] dark:hover:bg-white/5 dark:hover:text-white"
					>
						<svg
							className="h-3.5 w-3.5"
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

			<div className="flex flex-wrap items-center justify-between gap-4 p-0">
				<div className="flex items-center gap-2">
					<ModeToggle
						isResearchMode={isResearchMode}
						setIsResearchMode={setIsResearchMode}
						researchUsage={researchUsage}
					/>
					<CapabilityChips
						key={isPending || isStreaming ? 'capability-chips-disabled' : 'capability-chips-enabled'}
						onPromptSelect={(prompt, categoryKey) => {
							if (categoryKey === 'research') {
								setIsResearchMode(true)
							}
							applyPromptEdit({ nextValue: prompt, selectionStart: prompt.length, focus: true })
						}}
						isPending={isPending}
						isStreaming={isStreaming}
					/>
					{onOpenAlerts ? (
						<Tooltip
							content="Manage Alerts"
							render={<button type="button" onClick={onOpenAlerts} />}
							className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/12 text-amber-500 hover:bg-amber-500 hover:text-white"
						>
							<Icon name="calendar-plus" height={14} width={14} />
							<span className="sr-only">Manage Alerts</span>
						</Tooltip>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					<ImageUploadButton onClick={imageUpload.openFilePicker} />
					<SubmitButton
						isStreaming={isStreaming}
						isPending={isPending}
						hasValue={value.trim().length > 0}
						onStop={handleStopRequest}
					/>
				</div>
			</div>
		</form>
	)
}
