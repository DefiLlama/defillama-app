import { useRef, useState, useCallback, useEffect } from 'react'
import { errorToast } from '~/components/Toast'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface SelectedImage {
	file: File
	url: string
}

const ACCEPTED_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'application/pdf',
	'text/csv',
	'application/vnd.ms-excel'
])
const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.csv'])
const IMAGE_MAX_SIZE = 10 * 1024 * 1024
const FILE_MAX_SIZE = 30 * 1024 * 1024

function isImageType(type: string) {
	return type.startsWith('image/')
}

function hasAcceptedExtension(name: string) {
	const lowerName = name.toLowerCase()
	for (const extension of ACCEPTED_EXTENSIONS) {
		if (lowerName.endsWith(extension)) return true
	}
	return false
}

function isAcceptedFile(file: File) {
	return ACCEPTED_TYPES.has(file.type) || hasAcceptedExtension(file.name)
}

function maxSizeForType(type: string) {
	return isImageType(type) ? IMAGE_MAX_SIZE : FILE_MAX_SIZE
}

interface UseImageUploadOptions {
	maxImages?: number
	maxSizeBytes?: number
	droppedFiles?: File[] | null
	clearDroppedFiles?: () => void
}

export function useImageUpload({
	maxImages = 4,
	maxSizeBytes,
	droppedFiles,
	clearDroppedFiles
}: UseImageUploadOptions = {}) {
	const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
	const [isDragging, setIsDragging] = useState(false)
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const dragCounterRef = useRef(0)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const selectedImagesRef = useRef<SelectedImage[]>([])

	useEffect(() => {
		selectedImagesRef.current = selectedImages
	}, [selectedImages])

	useEffect(() => {
		return () => {
			for (const { url } of selectedImagesRef.current) {
				if (url) URL.revokeObjectURL(url)
			}
		}
	}, [])

	const addImages = useCallback(
		(files: File[]) => {
			const valid = files.filter((f) => isAcceptedFile(f) && f.size <= (maxSizeBytes ?? maxSizeForType(f.type)))
			if (valid.length === 0) return

			const newImages: SelectedImage[] = []
			for (const file of valid) {
				try {
					const url = isImageType(file.type) ? URL.createObjectURL(file) : ''
					newImages.push({ file, url })
				} catch (error) {
					console.error('Failed to create object URL for file:', file.name, error)
				}
			}

			if (newImages.length === 0) return

			setSelectedImages((prev) => {
				const totalCount = prev.length + newImages.length
				if (totalCount > maxImages) {
					queueMicrotask(() => {
						errorToast({
							title: 'File upload limit',
							description: `You may upload only ${maxImages} files at a time`
						})
					})
					for (const { url } of newImages.slice(maxImages - prev.length)) {
						if (url) URL.revokeObjectURL(url)
					}
				}
				return [...prev, ...newImages].slice(0, maxImages)
			})
		},
		[maxImages, maxSizeBytes]
	)

	const removeImage = useCallback((idx: number) => {
		setSelectedImages((prev) => {
			const removed = prev[idx]
			if (removed?.url) URL.revokeObjectURL(removed.url)
			return prev.filter((_, i) => i !== idx)
		})
	}, [])

	// Using functional setState to avoid selectedImages dependency (rerender-functional-setstate)
	// This makes the callback stable - doesn't recreate on selectedImages changes
	const clearImages = useCallback((revokeUrls = true) => {
		setSelectedImages((prev) => {
			if (revokeUrls) {
				for (const { url } of prev) {
					if (url) URL.revokeObjectURL(url)
				}
			}
			return []
		})
	}, [])

	const handleImageSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files) {
				trackUmamiEvent('llamaai-image-upload')
				addImages(Array.from(e.target.files))
			}
			// Reset input to allow re-selecting the same file
			e.currentTarget.value = ''
		},
		[addImages]
	)

	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			const files = Array.from(e.clipboardData.items)
				.map((item) => item.getAsFile())
				.filter((file): file is File => Boolean(file) && isAcceptedFile(file))
			if (files.length) {
				trackUmamiEvent('llamaai-file-paste')
				addImages(files)
			}
		},
		[addImages]
	)

	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		dragCounterRef.current++
		if (e.dataTransfer.types.includes('Files')) {
			setIsDragging(true)
		}
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		dragCounterRef.current--
		if (dragCounterRef.current === 0) {
			setIsDragging(false)
		}
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			dragCounterRef.current = 0
			setIsDragging(false)
			const files = Array.from(e.dataTransfer.files).filter(isAcceptedFile)
			if (files.length) {
				trackUmamiEvent('llamaai-file-upload', { method: 'drag_and_drop', count: files.length })
				addImages(files)
			}
		},
		[addImages]
	)

	const openFilePicker = useCallback(() => {
		fileInputRef.current?.click()
	}, [])

	// Handle externally dropped files from parent container
	useEffect(() => {
		if (droppedFiles && droppedFiles.length > 0) {
			try {
				addImages(droppedFiles)
			} catch (error) {
				console.error('Failed to add dropped images:', error)
			} finally {
				clearDroppedFiles?.()
			}
		}
	}, [droppedFiles, clearDroppedFiles, addImages])

	return {
		selectedImages,
		isDragging,
		previewImage,
		setPreviewImage,
		fileInputRef,
		addImages,
		removeImage,
		clearImages,
		handleImageSelect,
		handlePaste,
		handleDragEnter,
		handleDragLeave,
		handleDrop,
		openFilePicker
	}
}

export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}
