import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from 'react'
import { useMedia } from '~/hooks/useMedia'
import { useEntityCombobox } from '../hooks/useEntityCombobox'
import { useImageUpload, fileToBase64 } from '../hooks/useImageUpload'
import { setInputSize, syncHighlightScroll } from '../utils/scrollUtils'
import { highlightWord } from '../utils/textUtils'
import { EntityComboboxPopover } from './input/EntityCombobox'
import { DragOverlay, ImageUpload, ImageUploadButton } from './input/ImageUpload'
import { InputTextarea } from './input/InputTextarea'
import { ModeToggle, type ResearchUsage } from './input/ModeToggle'
import { SubmitButton } from './input/SubmitButton'

interface PromptInputProps {
	handleSubmit: (
		prompt: string,
		preResolvedEntities?: Array<{ term: string; slug: string }>,
		images?: Array<{ data: string; mimeType: string; filename?: string }>
	) => void
	promptInputRef: RefObject<HTMLTextAreaElement>
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
}

const trackSubmit = () => {
	if (typeof window !== 'undefined' && (window as any).umami) {
		;(window as any).umami.track('llamaai-prompt-submit')
	}
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
	externalDragging
}: PromptInputProps) {
	const [value, setValue] = useState('')
	const highlightRef = useRef<HTMLDivElement>(null)

	// Image upload handling
	const imageUpload = useImageUpload({ droppedFiles, clearDroppedFiles })

	// Entity combobox handling
	const entityCombobox = useEntityCombobox({
		promptInputRef,
		highlightRef,
		setValue
	})

	// Mobile placeholder handling
	const isMobile = useMedia('(max-width: 640px)')
	const mobilePlaceholder = placeholder.replace('Type @ to add a protocol, chain or stablecoin', '')
	const finalPlaceholder = isMobile ? mobilePlaceholder : placeholder

	// Handle restore request (e.g., failed submission retry)
	useEffect(() => {
		if (!restoreRequest) return
		const textarea = promptInputRef.current
		if (!textarea) return
		if (textarea.value.trim().length > 0) return

		const { text, entities } = restoreRequest

		entityCombobox.restoreEntities(entities)
		entityCombobox.isProgrammaticUpdateRef.current = true
		textarea.value = text
		setValue(text)
		setInputSize(promptInputRef, highlightRef)

		if (highlightRef.current) {
			highlightRef.current.innerHTML = highlightWord(text, Array.from(entityCombobox.entitiesRef.current))
		}

		entityCombobox.combobox.setValue('')
		entityCombobox.combobox.hide()
	}, [restoreRequest, entityCombobox, promptInputRef])

	// Focus input after external drop
	useEffect(() => {
		if (droppedFiles && droppedFiles.length > 0) {
			promptInputRef.current?.focus()
		}
	}, [droppedFiles, promptInputRef])

	const resetInput = (revokeImageUrls = true) => {
		setValue('')
		imageUpload.clearImages(revokeImageUrls)
		entityCombobox.resetCombobox()
		const textarea = promptInputRef.current
		if (textarea) {
			textarea.value = ''
			textarea.style.height = ''
		}
		if (highlightRef.current) {
			highlightRef.current.innerHTML = ''
			highlightRef.current.textContent = ''
			highlightRef.current.style.height = ''
		}
	}

	const submitForm = async (promptValue: string) => {
		trackSubmit()
		const finalEntities = entityCombobox.getFinalEntities()
		const imagesToSend = [...imageUpload.selectedImages]

		// Reset input immediately but don't revoke URLs yet if we have images
		// (we still need the File objects for base64 conversion)
		resetInput(imagesToSend.length === 0)

		if (imagesToSend.length > 0) {
			try {
				const images = await Promise.all(
					imagesToSend.map(async ({ file }) => ({
						data: await fileToBase64(file),
						mimeType: file.type,
						filename: file.name
					}))
				)
				// Revoke object URLs after base64 conversion to prevent memory leaks
				for (const { url } of imagesToSend) {
					URL.revokeObjectURL(url)
				}
				handleSubmit(promptValue, finalEntities, images)
			} catch (error) {
				console.error('Image upload failed', error)
				// Still revoke URLs on error to prevent leaks
				for (const { url } of imagesToSend) {
					URL.revokeObjectURL(url)
				}
			}
		} else {
			handleSubmit(promptValue, finalEntities)
		}
	}

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// First let entity combobox handle the event
		entityCombobox.handleKeyDown(event)
		if (event.defaultPrevented) return

		// Handle enter for submission
		if (event.key === 'Enter' && !event.shiftKey && !entityCombobox.hasRenderedItems) {
			event.preventDefault()
			if (isStreaming) return
			const promptValue = promptInputRef.current?.value ?? ''
			submitForm(promptValue)
		}
	}

	const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (promptInputRef.current) {
			setInputSize(promptInputRef, highlightRef)
		}
		entityCombobox.handleChange(event.target.value)
	}

	const handleScroll = () => {
		syncHighlightScroll(promptInputRef, highlightRef)
		entityCombobox.handleScroll()
	}

	const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const form = e.target as HTMLFormElement
		const promptValue = form.prompt.value
		submitForm(promptValue)
	}

	const handleFormClick = (e: React.MouseEvent<HTMLFormElement>) => {
		const target = e.target as HTMLElement
		if (!target.closest('button')) {
			promptInputRef.current?.focus()
		}
	}

	return (
		<form
			className="relative flex w-full flex-col gap-4 rounded-lg border border-[#e6e6e6] bg-(--app-bg) p-4 has-[textarea:focus]:border-(--old-blue) dark:border-[#222324]"
			onDragEnter={imageUpload.handleDragEnter}
			onDragLeave={imageUpload.handleDragLeave}
			onDragOver={(e) => e.preventDefault()}
			onDrop={imageUpload.handleDrop}
			onSubmit={handleFormSubmit}
			onClick={handleFormClick}
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
				<ModeToggle
					isResearchMode={isResearchMode}
					setIsResearchMode={setIsResearchMode}
					researchUsage={researchUsage}
				/>
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
