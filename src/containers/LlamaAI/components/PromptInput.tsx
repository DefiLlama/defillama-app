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
import { useMedia } from '~/hooks/useMedia'
import type { FormSubmitEvent } from '~/types/forms'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import { useEntityCombobox } from '../hooks/useEntityCombobox'
import { useImageUpload, fileToBase64 } from '../hooks/useImageUpload'
import { setInputSize, syncHighlightScroll } from '../utils/scrollUtils'
import { highlightWord } from '../utils/textUtils'
import { EntityComboboxPopover } from './input/EntityCombobox'
import { DragOverlay, ImageUpload, ImageUploadButton } from './input/ImageUpload'
import { InputTextarea } from './input/InputTextarea'
import { ModeToggle, type ResearchUsage } from './input/ModeToggle'
import { SubmitButton } from './input/SubmitButton'

// Browser object URLs are only needed for local previews, so clean them up after use.
function revokeImageUrls(images: Array<{ url: string }>) {
	for (let i = 0; i < images.length; i++) {
		URL.revokeObjectURL(images[i].url)
	}
}

interface PromptInputProps {
	handleSubmit: (
		prompt: string,
		preResolvedEntities?: Array<{ term: string; slug: string }>,
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
		entities?: Array<{ term: string; slug: string }>
	} | null
	isResearchMode: boolean
	setIsResearchMode: Dispatch<SetStateAction<boolean>>
	researchUsage?: ResearchUsage | null
	droppedFiles?: File[] | null
	clearDroppedFiles?: () => void
	externalDragging?: boolean
	onOpenAlerts?: () => void
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
	onOpenAlerts
}: PromptInputProps) {
	const [value, setValue] = useState('')
	const highlightRef = useRef<HTMLDivElement>(null)
	const pendingSelectionRef = useRef<PendingSelection | null>(null)

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
	const sanitizedHighlightedHtml = highlightWord(value, Array.from(entityCombobox.entitiesRef.current))

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

	const resetInput = (shouldRevoke = true) => {
		applyPromptEdit({
			nextValue: '',
			selectionStart: 0,
			selectionEnd: 0
		})
		imageUpload.clearImages(shouldRevoke)
		entityCombobox.resetCombobox()
	}

	// Submit the prompt plus any selected entities/images, then clear the local composer state.
	const submitForm = async (promptValue: string) => {
		trackSubmit()
		const finalEntities = entityCombobox.getFinalEntities()
		const imagesToSend = [...imageUpload.selectedImages]
		const hasImages = imagesToSend.length > 0

		resetInput(!hasImages)

		if (hasImages) {
			const processAndSubmitImages = async () => {
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
				const images = await Promise.all(imagePromises)
				await handleSubmit(promptValue, finalEntities, images)
			}
			try {
				await processAndSubmitImages()
			} catch (error) {
				console.error('Submission failed', error)
			}
			revokeImageUrls(imagesToSend)
		} else {
			void handleSubmit(promptValue, finalEntities)
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

	return (
		<form
			className="relative flex w-full flex-col gap-4 rounded-lg border border-[#e6e6e6] bg-(--app-bg) p-4 has-[textarea:focus]:border-(--old-blue) dark:border-[#222324]"
			onDragEnter={imageUpload.handleDragEnter}
			onDragLeave={imageUpload.handleDragLeave}
			onDragOver={(e) => e.preventDefault()}
			onDrop={imageUpload.handleDrop}
			onSubmit={handleFormSubmit}
			onPointerDown={handleFormPointerDown}
		>
			<DragOverlay isDragging={imageUpload.isDragging} externalDragging={externalDragging} />

			<ImageUpload
				selectedImages={imageUpload.selectedImages}
				previewImage={imageUpload.previewImage}
				setPreviewImage={imageUpload.setPreviewImage}
				removeImage={imageUpload.removeImage}
				fileInputRef={imageUpload.fileInputRef}
				handleImageSelect={imageUpload.handleImageSelect}
			/>

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
				onPaste={imageUpload.handlePaste}
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

			<div className="flex flex-wrap items-center justify-between gap-4 p-0">
				<div className="flex items-center gap-2">
					<ModeToggle
						isResearchMode={isResearchMode}
						setIsResearchMode={setIsResearchMode}
						researchUsage={researchUsage}
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
