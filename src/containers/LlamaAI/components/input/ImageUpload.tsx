import { RefObject } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { ImagePreviewModal } from '../ImagePreviewModal'

interface SelectedImage {
	file: File
	url: string
}

interface ImageUploadProps {
	selectedImages: SelectedImage[]
	previewImage: string | null
	setPreviewImage: (url: string | null) => void
	removeImage: (idx: number) => void
	fileInputRef: RefObject<HTMLInputElement>
	handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ImageUpload({
	selectedImages,
	previewImage,
	setPreviewImage,
	removeImage,
	fileInputRef,
	handleImageSelect
}: ImageUploadProps) {
	return (
		<>
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
		</>
	)
}

interface ImageUploadButtonProps {
	onClick: () => void
}

export function ImageUploadButton({ onClick }: ImageUploadButtonProps) {
	return (
		<Tooltip
			content="Add image (or paste with Ctrl+V)"
			render={
				<button
					type="button"
					onClick={onClick}
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
				<span className="text-lg">Drop images here</span>
			</div>
		</div>
	)
}
