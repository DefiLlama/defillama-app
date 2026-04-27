import type { RefObject } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { ImagePreviewModal } from '~/containers/LlamaAI/components/ImagePreviewModal'
import { isReadableTextFile } from '~/containers/LlamaAI/hooks/useImageUpload'

interface SelectedImage {
	file: File
	url: string
	isPasted?: boolean
	textContent?: string
}

interface TextPreview {
	content: string
	filename: string
	isPasted?: boolean
}

interface ImageUploadProps {
	selectedImages: SelectedImage[]
	previewImage: string | null
	setPreviewImage: (url: string | null) => void
	openPastedPreview?: (preview: TextPreview | null) => void
	removeImage: (idx: number) => void
	fileInputRef: RefObject<HTMLInputElement | null>
	handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function formatBytes(byteLength: number): string {
	if (byteLength < 1024) return `${byteLength} B`
	const kb = byteLength / 1024
	if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
	return `${(kb / 1024).toFixed(1)} MB`
}

function fileExtensionLabel(name: string): string {
	const dot = name.lastIndexOf('.')
	if (dot === -1 || dot === name.length - 1) return 'TXT'
	return name
		.slice(dot + 1)
		.toUpperCase()
		.slice(0, 4)
}

function TextChip({
	file,
	textContent,
	isPasted,
	onOpen,
	onRemove
}: {
	file: File
	textContent: string
	isPasted: boolean
	onOpen: () => void
	onRemove: () => void
}) {
	const topLine = isPasted
		? (textContent.split('\n').find((line) => line.trim().length > 0) ?? '').trim() || file.name
		: file.name
	const badgeLabel = isPasted ? 'Pasted' : fileExtensionLabel(file.name)
	const size = formatBytes(file.size)
	const removeLabel = isPasted ? 'Remove pasted content' : 'Remove file'
	return (
		<div className="group relative">
			<button
				type="button"
				onClick={onOpen}
				title={isPasted ? 'Open pasted content' : `Open ${file.name}`}
				className="flex h-16 w-52 cursor-pointer flex-col justify-between rounded-lg border border-[#E6E6E6] bg-[#fafafa] px-3 py-2 text-left transition-colors hover:border-(--old-blue)/40 hover:bg-[#f0f0f0] dark:border-[#39393E] dark:bg-[#1a1b1c] dark:hover:border-(--old-blue)/40 dark:hover:bg-[#222324]"
			>
				<p
					className={`truncate text-[11px] leading-tight ${
						isPasted
							? 'font-mono text-[#555] dark:text-[#9b9c9f]'
							: 'font-sans font-medium text-[#1a1a1a] dark:text-white'
					}`}
				>
					{topLine}
				</p>
				<div className="flex items-center gap-1.5">
					<span className="rounded bg-(--old-blue)/15 px-1.5 py-px font-sans text-[9px] font-bold tracking-[0.12em] text-[#1853A8] uppercase dark:text-[#4B86DB]">
						{badgeLabel}
					</span>
					<span className="font-sans text-[10px] text-[#888] dark:text-[#666]">{size}</span>
				</div>
			</button>
			<button
				type="button"
				onClick={onRemove}
				className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80 focus-visible:opacity-100"
			>
				<Icon name="x" height={12} width={12} />
				<span className="sr-only">{removeLabel}</span>
			</button>
		</div>
	)
}

export function ImageUpload({
	selectedImages,
	previewImage,
	setPreviewImage,
	openPastedPreview,
	removeImage,
	fileInputRef,
	handleImageSelect
}: ImageUploadProps) {
	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/csv,.pdf,.csv,text/markdown,text/plain,.md,.txt"
				multiple
				onChange={handleImageSelect}
				className="hidden"
			/>
			{selectedImages.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{selectedImages.map(({ file, url, isPasted, textContent }, idx) => {
						const isImage = file.type.startsWith('image/')
						const itemKey = url || `${file.name}-${file.size}-${file.lastModified}-${idx}`
						const isTextChip = !!isPasted || isReadableTextFile(file)

						if (isTextChip) {
							return (
								<TextChip
									key={itemKey}
									file={file}
									textContent={textContent ?? ''}
									isPasted={!!isPasted}
									onOpen={async () => {
										let content = textContent
										if (typeof content !== 'string') {
											try {
												content = await file.text()
											} catch (error) {
												console.error('Failed to read text file content', file.name, error)
												content = ''
											}
										}
										openPastedPreview?.({
											content,
											filename: file.name,
											isPasted: !!isPasted
										})
									}}
									onRemove={() => removeImage(idx)}
								/>
							)
						}

						return (
							<div
								key={itemKey}
								className="relative h-16 overflow-hidden rounded-lg"
								style={{ width: isImage ? '4rem' : 'auto' }}
							>
								{isImage ? (
									<button type="button" onClick={() => setPreviewImage(url)} className="h-full w-full cursor-pointer">
										<img src={url} alt={file.name} className="h-full w-full object-cover" />
									</button>
								) : (
									<div className="flex h-full items-center gap-2 rounded-lg bg-[#f0f0f0] px-3 dark:bg-[#1a1a2e]">
										<Icon name="file-text" height={18} width={18} />
										<span className="max-w-[120px] truncate text-xs">{file.name}</span>
									</div>
								)}
								<button
									type="button"
									onClick={() => removeImage(idx)}
									className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
								>
									<Icon name="x" height={12} width={12} />
									<span className="sr-only">Remove file</span>
								</button>
							</div>
						)
					})}
				</div>
			) : null}
			<ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
		</>
	)
}

interface ImageUploadButtonProps {
	onClick: () => void
}

export function ImageUploadButton({ onClick }: ImageUploadButtonProps) {
	return (
		<Tooltip
			content="Attach file (or paste with Ctrl+V)"
			render={
				<button
					type="button"
					onClick={onClick}
					aria-label="Attach file"
					className="group flex h-7 w-7 items-center justify-center rounded-lg border border-[#DEDEDE] hover:bg-(--old-blue)/10 disabled:opacity-25 dark:border-[#2F3336] dark:hover:bg-(--old-blue)/15"
				/>
			}
		>
			<Icon name="image-plus" height={14} width={14} />
		</Tooltip>
	)
}

interface DragOverlayProps {
	isDragging: boolean
	externalDragging?: boolean
}

export function DragOverlay({ isDragging, externalDragging }: DragOverlayProps) {
	if (!isDragging && !externalDragging) return null

	return (
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
				<span className="text-lg">Drop files here</span>
			</div>
		</div>
	)
}
