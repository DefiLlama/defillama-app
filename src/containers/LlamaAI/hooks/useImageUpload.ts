import { useRef, useState, useCallback, useEffect } from 'react'
import { errorToast } from '~/components/Toast'

interface SelectedImage {
	file: File
	url: string
}

interface UseImageUploadOptions {
	maxImages?: number
	maxSizeBytes?: number
	droppedFiles?: File[] | null
	clearDroppedFiles?: () => void
}

export function useImageUpload({
	maxImages = 4,
	maxSizeBytes = 10 * 1024 * 1024,
	droppedFiles,
	clearDroppedFiles
}: UseImageUploadOptions = {}) {
	const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
	const [isDragging, setIsDragging] = useState(false)
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const dragCounterRef = useRef(0)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const addImages = useCallback(
		(files: File[]) => {
			const valid = files.filter((f) => f.size <= maxSizeBytes && f.type.startsWith('image/'))
			if (valid.length === 0) return

			const newImages: SelectedImage[] = []
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
				if (totalCount > maxImages) {
					queueMicrotask(() => {
						errorToast({
							title: 'Image upload limit',
							description: `You may upload only ${maxImages} images at a time`
						})
					})
					// Revoke URLs for images that won't be used
					for (const { url } of newImages.slice(maxImages - prev.length)) {
						URL.revokeObjectURL(url)
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
			if (removed) URL.revokeObjectURL(removed.url)
			return prev.filter((_, i) => i !== idx)
		})
	}, [])

	// Using functional setState to avoid selectedImages dependency (rerender-functional-setstate)
	// This makes the callback stable - doesn't recreate on selectedImages changes
	const clearImages = useCallback((revokeUrls = true) => {
		setSelectedImages((prev) => {
			if (revokeUrls) {
				for (const { url } of prev) {
					URL.revokeObjectURL(url)
				}
			}
			return []
		})
	}, [])

	const handleImageSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files) addImages(Array.from(e.target.files))
			// Reset input to allow re-selecting the same file
			e.currentTarget.value = ''
		},
		[addImages]
	)

	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			const files = Array.from(e.clipboardData.items)
				.filter((item) => item.type.startsWith('image/'))
				.map((item) => item.getAsFile())
				.filter(Boolean) as File[]
			if (files.length) addImages(files)
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
			const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
			if (files.length) addImages(files)
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
