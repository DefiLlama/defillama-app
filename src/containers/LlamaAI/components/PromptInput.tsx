import * as Ariakit from '@ariakit/react'
import { Dispatch, memo, RefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { errorToast } from '~/components/Toast'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useMedia } from '~/hooks/useMedia'
import { useGetEntities } from '../hooks/useGetEntities'
import { getAnchorRect, getSearchValue, getTrigger, getTriggerOffset, replaceValue } from '../utils/entitySuggestions'
import { setInputSize, syncHighlightScroll } from '../utils/scrollUtils'
import { highlightWord } from '../utils/textUtils'
import { ImagePreviewModal } from './ImagePreviewModal'

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
	researchUsage?: {
		remainingUsage: number
		limit: number
		period: 'lifetime' | 'daily' | 'unlimited' | 'blocked'
		resetTime: string | null
	} | null
	droppedFiles?: File[] | null
	clearDroppedFiles?: () => void
	externalDragging?: boolean
}

export const PromptInput = memo(function PromptInput({
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
	const [selectedImages, setSelectedImages] = useState<Array<{ file: File; url: string }>>([])
	const [isDragging, setIsDragging] = useState(false)
	const [isTriggerOnly, setIsTriggerOnly] = useState(false)
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const dragCounterRef = useRef(0)
	const highlightRef = useRef<HTMLDivElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const entitiesRef = useRef<Set<string>>(new Set())
	const entitiesMapRef = useRef<Map<string, { id: string; name: string; type: string }>>(new Map())
	const isProgrammaticUpdateRef = useRef(false)

	const addImages = (files: File[]) => {
		const valid = files.filter((f) => f.size <= 10 * 1024 * 1024 && f.type.startsWith('image/'))
		if (valid.length === 0) return

		const newImages: Array<{ file: File; url: string }> = []
		for (const file of valid) {
			try {
				const url = URL.createObjectURL(file)
				newImages.push({ file, url })
			} catch (error) {
				console.error('Failed to create object URL for file:', file.name, error)
			}
		}

		if (newImages.length === 0) return

		setSelectedImages((prev) => {
			const totalCount = prev.length + newImages.length
			if (totalCount > 4) {
				queueMicrotask(() => {
					errorToast({ title: 'Image upload limit', description: 'You may upload only 4 images at a time' })
				})
				// Revoke URLs for images that won't be used
				for (const { url } of newImages.slice(4 - prev.length)) {
					URL.revokeObjectURL(url)
				}
			}
			return [...prev, ...newImages].slice(0, 4)
		})
	}

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) addImages(Array.from(e.target.files))
	}

	const handlePaste = (e: React.ClipboardEvent) => {
		const files = Array.from(e.clipboardData.items)
			.filter((item) => item.type.startsWith('image/'))
			.map((item) => item.getAsFile())
			.filter(Boolean) as File[]
		if (files.length) addImages(files)
	}

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		dragCounterRef.current++
		if (e.dataTransfer.types.includes('Files')) {
			setIsDragging(true)
		}
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		dragCounterRef.current--
		if (dragCounterRef.current === 0) {
			setIsDragging(false)
		}
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		dragCounterRef.current = 0
		setIsDragging(false)
		const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
		if (files.length) addImages(files)
	}

	const removeImage = (idx: number) => {
		setSelectedImages((prev) => {
			const removed = prev[idx]
			if (removed) URL.revokeObjectURL(removed.url)
			return prev.filter((_, i) => i !== idx)
		})
	}

	const fileToBase64 = (file: File): Promise<string> =>
		new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(file)
		})

	const isMobile = useMedia('(max-width: 640px)')
	const mobilePlaceholder = placeholder.replace('Type @ to add a protocol, chain or stablecoin', '')
	const finalPlaceholder = isMobile ? mobilePlaceholder : placeholder

	const combobox = Ariakit.useComboboxStore()
	const searchValue = Ariakit.useStoreState(combobox, 'value')

	const { data: matches, isFetching, isLoading } = useGetEntities(searchValue)

	const hasMatches = matches && matches.length > 0

	useEffect(() => {
		combobox.render()
	}, [combobox])

	useEffect(() => {
		if (!restoreRequest) return
		const textarea = promptInputRef.current
		if (!textarea) return

		if (textarea.value.trim().length > 0) return

		const { text, entities } = restoreRequest

		entitiesRef.current.clear()
		entitiesMapRef.current.clear()
		if (entities && entities.length > 0) {
			for (const { term, slug } of entities) {
				entitiesRef.current.add(term)
				entitiesMapRef.current.set(term, { id: slug, name: term, type: '' })
			}
		}

		isProgrammaticUpdateRef.current = true
		textarea.value = text
		setValue(text)
		setInputSize(promptInputRef, highlightRef)

		if (highlightRef.current) {
			highlightRef.current.innerHTML = highlightWord(text, Array.from(entitiesRef.current))
		}

		combobox.setValue('')
		combobox.hide()
	}, [restoreRequest, combobox, promptInputRef])

	useEffect(() => {
		return () => {
			combobox.hide()
		}
	}, [combobox])

	// Handle externally dropped files from parent container
	useEffect(() => {
		if (droppedFiles && droppedFiles.length > 0) {
			try {
				addImages(droppedFiles)
			} catch (error) {
				console.error('Failed to add dropped images:', error)
			} finally {
				clearDroppedFiles?.()
				promptInputRef.current?.focus()
			}
		}
	}, [droppedFiles, clearDroppedFiles, promptInputRef])

	const getFinalEntities = () => {
		const currentValue = promptInputRef.current?.value ?? ''
		return Array.from(entitiesRef.current)
			.map((name) => {
				const data = entitiesMapRef.current.get(name)
				if (!data) return null
				return {
					term: name,
					slug: data.id
				}
			})
			.filter((entity) => entity !== null && currentValue.includes(entity.term)) as Array<{
			term: string
			slug: string
		}>
	}

	const resetInput = (revokeImageUrls = true) => {
		setValue('')
		setIsTriggerOnly(false)
		if (revokeImageUrls) {
			for (const { url } of selectedImages) {
				URL.revokeObjectURL(url)
			}
		}
		setSelectedImages([])
		combobox.setValue('')
		combobox.hide()
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
		entitiesRef.current.clear()
		entitiesMapRef.current.clear()
	}

	const trackSubmit = () => {
		if (typeof window !== 'undefined' && (window as any).umami) {
			;(window as any).umami.track('llamaai-prompt-submit')
		}
	}

	const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const textarea = promptInputRef.current
		if (!textarea) return

		if (event.key === 'Backspace' || event.key === 'Delete') {
			const { selectionStart, selectionEnd, value } = textarea

			if (selectionStart !== selectionEnd) return

			const isBackspace = event.key === 'Backspace'
			const checkPos = isBackspace ? selectionStart - 1 : selectionStart

			for (const entityName of entitiesRef.current) {
				const entityIndex = value.indexOf(entityName, Math.max(0, checkPos - entityName.length))
				if (entityIndex === -1 || entityIndex > checkPos) continue

				const entityEnd = entityIndex + entityName.length
				if (checkPos >= entityIndex && checkPos < entityEnd) {
					event.preventDefault()
					const newValue = value.slice(0, entityIndex) + value.slice(entityEnd)

					textarea.value = newValue
					setValue(newValue)
					setInputSize(promptInputRef, highlightRef)
					combobox.setValue('')
					combobox.hide()

					entitiesRef.current.delete(entityName)
					entitiesMapRef.current.delete(entityName)

					if (highlightRef.current) {
						highlightRef.current.innerHTML = highlightWord(newValue, Array.from(entitiesRef.current))
					}

					setTimeout(() => {
						textarea.setSelectionRange(entityIndex, entityIndex)
					}, 0)
					return
				}
			}
		}

		if (event.key === 'Tab' && combobox.getState().renderedItems.length > 0) {
			event.preventDefault()
			const activeValue = combobox.getState().activeValue
			if (activeValue && matches && matches.length > 0) {
				const activeItem = matches.find((item) => item.id === activeValue)
				if (activeItem) {
					const { id, name, type } = activeItem
					onItemClick({ id, name, type })()
				}
			}
		}

		if (event.key === 'Enter' && !event.shiftKey && combobox.getState().renderedItems.length === 0) {
			event.preventDefault()

			if (isStreaming) {
				return
			}

			trackSubmit()
			const finalEntities = getFinalEntities()
			const promptValue = promptInputRef.current?.value ?? ''
			const imagesToSend = [...selectedImages]

			resetInput(imagesToSend.length === 0)

			if (imagesToSend.length > 0) {
				Promise.all(
					imagesToSend.map(async ({ file }) => ({
						data: await fileToBase64(file),
						mimeType: file.type,
						filename: file.name
					}))
				)
					.then((images) => {
						handleSubmit(promptValue, finalEntities, images)
					})
					.catch((error) => {
						console.error('Image upload failed', error)
					})
			} else {
				handleSubmit(promptValue, finalEntities)
			}
		}
	}

	const handleScroll = () => {
		syncHighlightScroll(promptInputRef, highlightRef)
		const textarea = promptInputRef.current
		if (textarea && typeof window !== 'undefined') {
			const anchor = getAnchorRect(textarea)
			const spaceBelow = window.innerHeight - (anchor.y + anchor.height)
			const spaceAbove = anchor.y
			// Prefer the side with more room to avoid rendering "below" when we're near the bottom of the viewport.
			const nextPlacement = spaceBelow < 220 && spaceAbove > spaceBelow ? 'top-start' : 'bottom-start'
			if (combobox.getState().placement !== nextPlacement) {
				combobox.setState('placement', nextPlacement)
			}
		}
		combobox.render()
	}

	const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (promptInputRef.current) {
			setInputSize(promptInputRef, highlightRef)
		}

		const currentValue = event.target.value
		setValue(currentValue)

		if (highlightRef.current) {
			highlightRef.current.innerHTML = highlightWord(currentValue, Array.from(entitiesRef.current))
		}

		if (isProgrammaticUpdateRef.current) {
			isProgrammaticUpdateRef.current = false
			return
		}

		const trigger = getTrigger(event.target)
		const searchValue = getSearchValue(event.target)
		const triggerOffset = getTriggerOffset(event.target)
		const actualTrigger = triggerOffset !== -1 ? event.target.value[triggerOffset] : null
		const searchValueWithTrigger =
			actualTrigger === '$' ? `$${searchValue}` : actualTrigger === '@' ? `@${searchValue}` : searchValue

		if (typeof window !== 'undefined') {
			const anchor = getAnchorRect(event.target)
			const spaceBelow = window.innerHeight - (anchor.y + anchor.height)
			const spaceAbove = anchor.y
			const nextPlacement = spaceBelow < 220 && spaceAbove > spaceBelow ? 'top-start' : 'bottom-start'
			if (combobox.getState().placement !== nextPlacement) {
				combobox.setState('placement', nextPlacement)
			}
		}

		if (triggerOffset !== -1 && searchValue.length > 0) {
			setIsTriggerOnly(false)
			combobox.show()
			combobox.setValue(searchValueWithTrigger)
		} else if (trigger && searchValue.length === 0) {
			// Open suggestions immediately after typing a trigger, but don't fetch until there's a query.
			// If the user types whitespace after the trigger, `getTriggerOffset` returns -1 and we'll hide.
			setIsTriggerOnly(true)
			combobox.show()
			combobox.setValue(actualTrigger === '$' ? '$' : '@')
		} else if (triggerOffset === -1) {
			setIsTriggerOnly(false)
			combobox.setValue('')
			combobox.hide()
		}
	}

	const onItemClick = useCallback(
		({ id, name, type }: { id: string; name: string; type: string }) =>
			() => {
				const textarea = promptInputRef.current
				if (!textarea) return

				const offset = getTriggerOffset(textarea)

				entitiesRef.current.add(name)
				entitiesMapRef.current.set(name, { id, name, type })

				const getNewValue = replaceValue(offset, searchValue, name)
				const newValue = getNewValue(textarea.value)

				combobox.setValue('')
				combobox.hide()

				isProgrammaticUpdateRef.current = true
				textarea.value = newValue
				setInputSize(promptInputRef, highlightRef)
				setValue(newValue)

				if (highlightRef.current) {
					highlightRef.current.innerHTML = highlightWord(newValue, Array.from(entitiesRef.current))
				}

				setTimeout(() => {
					textarea.focus()
				}, 0)
			},
		[combobox, searchValue, promptInputRef]
	)

	return (
		<>
			<form
				className="relative flex w-full flex-col gap-4 rounded-lg border border-[#e6e6e6] bg-(--app-bg) p-4 has-[textarea:focus]:border-(--old-blue) dark:border-[#222324]"
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={(e) => e.preventDefault()}
				onDrop={handleDrop}
				onSubmit={(e) => {
					e.preventDefault()
					trackSubmit()
					const form = e.target as HTMLFormElement
					const finalEntities = getFinalEntities()
					const promptValue = form.prompt.value
					const imagesToSend = [...selectedImages]

					resetInput(imagesToSend.length === 0)

					if (imagesToSend.length > 0) {
						Promise.all(
							imagesToSend.map(async ({ file }) => ({
								data: await fileToBase64(file),
								mimeType: file.type,
								filename: file.name
							}))
						)
							.then((images) => {
								handleSubmit(promptValue, finalEntities, images)
							})
							.catch((error) => {
								console.error('Image upload failed', error)
							})
					} else {
						handleSubmit(promptValue, finalEntities)
					}
				}}
				onClick={(e) => {
					const target = e.target as HTMLElement
					if (!target.closest('button')) {
						promptInputRef.current?.focus()
					}
				}}
			>
				{(isDragging || externalDragging) && (
					<div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-(--old-blue) bg-(--old-blue)/10 backdrop-blur-[2px]">
						<div className="flex items-center gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
								<path
									d="M6 18C6 24.6274 11.3726 30 18 30C24.6274 30 30 24.6274 30 18"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								/>
								<path
									d="M18 6L18 21M18 21L22.5 16.5M18 21L13.5 16.5"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<span className="text-lg">Drop images here</span>
						</div>
					</div>
				)}
				<input
					ref={fileInputRef}
					type="file"
					accept="image/png,image/jpeg,image/gif,image/webp"
					multiple
					onChange={handleImageSelect}
					className="hidden"
				/>
				{selectedImages.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{selectedImages.map(({ file, url }, idx) => (
							<div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg">
								<button type="button" onClick={() => setPreviewImage(url)} className="h-full w-full cursor-pointer">
									<img src={url} alt={file.name} className="h-full w-full object-cover" />
								</button>
								<button
									type="button"
									onClick={() => removeImage(idx)}
									className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
								>
									<Icon name="x" height={12} width={12} />
									<span className="sr-only">Remove image</span>
								</button>
							</div>
						))}
					</div>
				)}
				<ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
				<div className="relative w-full">
					<Ariakit.Combobox
						store={combobox}
						autoSelect
						value={value}
						showOnClick={false}
						showOnChange={false}
						showOnKeyPress={false}
						setValueOnChange={false}
						render={
							<textarea
								ref={promptInputRef}
								rows={1}
								maxLength={2000}
								placeholder={finalPlaceholder}
								onScroll={handleScroll}
								onPointerDown={combobox.hide}
								onChange={onChange}
								onKeyDown={onKeyDown}
								onPaste={handlePaste}
								name="prompt"
								className="relative z-[1] block thin-scrollbar min-h-4 w-full resize-none overflow-x-hidden overflow-y-auto border-0 bg-transparent p-0 leading-normal break-words whitespace-pre-wrap text-transparent caret-black outline-none placeholder:text-[#666] max-sm:text-base dark:caret-white placeholder:dark:text-[#919296]"
								autoCorrect="off"
								autoComplete="off"
								spellCheck="false"
							/>
						}
						disabled={isPending && !isStreaming}
					/>
					<div
						className="highlighted-text pointer-events-none absolute top-0 right-0 bottom-0 left-0 z-0 thin-scrollbar min-h-4 overflow-x-hidden overflow-y-auto p-0 leading-normal break-words whitespace-pre-wrap max-sm:text-base"
						ref={highlightRef}
					/>
				</div>
				{(hasMatches || (isTriggerOnly && (isLoading || isFetching))) && (
					<Ariakit.ComboboxPopover
						store={combobox}
						unmountOnHide
						portal={true}
						flip={true}
						fitViewport
						getAnchorRect={() => {
							const textarea = promptInputRef.current
							if (!textarea) return null
							return getAnchorRect(textarea)
						}}
						className="relative z-50 flex max-h-(--popover-available-height) max-w-[280px] min-w-[100px] flex-col overflow-auto overscroll-contain rounded-lg border border-[#e6e6e6] bg-(--app-bg) shadow-lg dark:border-[#222324]"
					>
						{hasMatches ? (
							matches.map(({ id, name, logo, type }) => (
								<Ariakit.ComboboxItem
									key={id}
									value={id}
									focusOnHover
									onClick={onItemClick({ id, name, type })}
									className="flex cursor-pointer items-center gap-1.5 border-t border-[#e6e6e6] px-3 py-2 first:border-t-0 hover:bg-[#e6e6e6] focus-visible:bg-[#e6e6e6] data-[active-item]:bg-[#e6e6e6] dark:border-[#222324] dark:hover:bg-[#222324] dark:focus-visible:bg-[#222324] dark:data-[active-item]:bg-[#222324]"
								>
									{logo && <TokenLogo logo={logo} size={20} />}
									<span className="flex items-center gap-1.5">
										<span className="text-sm font-medium">{name}</span>
										<span
											className={`rounded px-1.5 py-0.5 text-xs font-medium ${
												type === 'Chain'
													? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
													: type == 'Protocol'
														? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
														: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
											}`}
										>
											{type}
										</span>
									</span>
								</Ariakit.ComboboxItem>
							))
						) : (
							<div className="px-3 py-2 text-sm text-[#666] dark:text-[#999]">Loading…</div>
						)}
					</Ariakit.ComboboxPopover>
				)}
				<div className="flex flex-wrap items-center justify-between gap-4 p-0">
					<div className="flex items-center rounded-lg border border-[#EEE] bg-white p-0.5 dark:border-[#232628] dark:bg-[#131516]">
						<Tooltip
							content={
								<div className="flex max-w-[200px] flex-col gap-1">
									<span className="font-medium text-[#1a1a1a] dark:text-white">Quick Mode</span>
									<span className="text-[#666] dark:text-[#999]">Fast responses for most queries</span>
								</div>
							}
							render={
								<button
									type="button"
									onClick={() => setIsResearchMode(false)}
									data-umami-event="llamaai-quick-mode-toggle"
									data-active={!isResearchMode}
								/>
							}
							className="flex min-h-6 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#878787] data-[active=true]:bg-(--old-blue)/10 data-[active=true]:text-[#1853A8] dark:text-[#878787] dark:data-[active=true]:bg-(--old-blue)/15 dark:data-[active=true]:text-[#4B86DB]"
						>
							<Icon name="sparkles" height={12} width={12} />
							<span>Quick</span>
						</Tooltip>
						<Tooltip
							content={
								<div className="flex max-w-[220px] flex-col gap-1.5">
									<span className="font-medium text-[#1a1a1a] dark:text-white">Research Mode</span>
									<span className="text-[#666] dark:text-[#999]">
										Comprehensive reports with in-depth analysis and citations
									</span>
									<span className="border-t border-[#eee] pt-1.5 text-[11px] text-[#555] dark:border-[#333] dark:text-[#aaa]">
										{researchUsage?.period === 'unlimited'
											? 'Unlimited reports'
											: researchUsage?.period === 'blocked'
												? 'Sign in to use research'
												: researchUsage
													? `${researchUsage.remainingUsage}/${researchUsage.limit} remaining${researchUsage.period === 'daily' ? ' today' : ''}`
													: '5 reports/day · Free trial: 3 total'}
									</span>
								</div>
							}
							render={
								<button
									type="button"
									onClick={() => setIsResearchMode(true)}
									data-umami-event="llamaai-research-mode-toggle"
									data-active={isResearchMode}
								/>
							}
							className="flex min-h-6 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#878787] data-[active=true]:bg-(--old-blue)/10 data-[active=true]:text-[#1853A8] dark:text-[#878787] dark:data-[active=true]:bg-(--old-blue)/15 dark:data-[active=true]:text-[#4B86DB]"
						>
							<Icon name="search" height={12} width={12} />
							<span>Research</span>
							{researchUsage && researchUsage.limit > 0 && researchUsage.period !== 'unlimited' && (
								<span className="text-[10px] opacity-70">
									{researchUsage.remainingUsage}/{researchUsage.limit}
								</span>
							)}
						</Tooltip>
					</div>
					<div className="flex items-center gap-2">
						<Tooltip
							content="Add image (or paste with Ctrl+V)"
							render={
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="group flex h-7 w-7 items-center justify-center rounded-lg border border-[#DEDEDE] hover:bg-(--old-blue)/10 disabled:opacity-25 dark:border-[#2F3336] dark:hover:bg-(--old-blue)/15"
								/>
							}
						>
							<Icon name="image-plus" height={14} width={14} />
						</Tooltip>
						{isStreaming ? (
							<Tooltip
								content="Stop"
								render={<button onClick={handleStopRequest} data-umami-event="llamaai-stop-generation" />}
								className="group flex h-7 w-7 items-center justify-center rounded-lg bg-(--old-blue)/12 hover:bg-(--old-blue)"
							>
								<span className="block h-2 w-2 bg-(--old-blue) group-hover:bg-white group-focus-visible:bg-white sm:h-2.5 sm:w-2.5" />
								<span className="sr-only">Stop</span>
							</Tooltip>
						) : (
							<button
								type="submit"
								data-umami-event="llamaai-prompt-submit"
								className="flex h-7 w-7 items-center justify-center gap-2 rounded-lg bg-(--old-blue) text-white hover:bg-(--old-blue)/80 focus-visible:bg-(--old-blue)/80 disabled:opacity-25"
								disabled={isPending || isStreaming || !value.trim()}
							>
								<Icon name="arrow-up" height={14} width={14} className="sm:h-4 sm:w-4" />
								<span className="sr-only">Submit prompt</span>
							</button>
						)}
					</div>
				</div>
			</form>
		</>
	)
})
