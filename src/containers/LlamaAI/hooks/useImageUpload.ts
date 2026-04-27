import { useRef, useState, useCallback, useEffect } from 'react'
import { errorToast } from '~/components/Toast'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface SelectedImage {
	file: File
	url: string
	isPasted?: boolean
	textContent?: string
}

const ACCEPTED_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'application/pdf',
	'text/csv',
	'text/markdown',
	'text/plain'
])
const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.csv', '.md', '.txt'])
const IMAGE_MAX_SIZE = 10 * 1024 * 1024
const FILE_MAX_SIZE = 30 * 1024 * 1024
const MAX_TOTAL_BYTES = 50 * 1024 * 1024

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

const READABLE_TEXT_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv'])
const READABLE_TEXT_EXTENSIONS = ['.txt', '.md', '.csv']

export function isReadableTextFile(file: File): boolean {
	if (READABLE_TEXT_TYPES.has(file.type)) return true
	const lower = file.name.toLowerCase()
	return READABLE_TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))
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
	maxImages = 15,
	maxSizeBytes,
	droppedFiles,
	clearDroppedFiles
}: UseImageUploadOptions = {}) {
	const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
	const [isDragging, setIsDragging] = useState(false)
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const [pastedPreview, setPastedPreview] = useState<{ content: string; filename: string } | null>(null)
	const dragCounterRef = useRef(0)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const selectedImagesRef = useRef<SelectedImage[]>([])
	const pastedCounterRef = useRef(0)

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
			const rejected: { type: 'size' | 'format'; file: File }[] = []
			const valid: File[] = []
			for (const f of files) {
				if (!isAcceptedFile(f)) {
					rejected.push({ type: 'format', file: f })
				} else if (f.size > (maxSizeBytes ?? maxSizeForType(f.type))) {
					rejected.push({ type: 'size', file: f })
				} else {
					valid.push(f)
				}
			}

			if (rejected.length > 0) {
				const sizeRejected = rejected.filter((r) => r.type === 'size')
				const formatRejected = rejected.filter((r) => r.type === 'format')
				if (sizeRejected.length > 0) {
					const uniqueMBs = [
						...new Set(
							sizeRejected.map((r) => Math.round((maxSizeBytes ?? maxSizeForType(r.file.type)) / (1024 * 1024)))
						)
					]
					queueMicrotask(() => {
						const limitsText = uniqueMBs.join('MB, ') + 'MB'
						errorToast({
							title: 'File too large',
							description:
								sizeRejected.length === 1
									? `${sizeRejected[0].file.name} exceeds the ${limitsText} limit`
									: uniqueMBs.length === 1
										? `${sizeRejected.length} files exceed the ${limitsText} limit`
										: `${sizeRejected.length} files exceed their size limits (${limitsText})`
						})
					})
				}
				if (formatRejected.length > 0) {
					queueMicrotask(() => {
						errorToast({
							title: 'Unsupported file type',
							description: 'Supported formats: PNG, JPEG, GIF, WebP, PDF, CSV, MD, TXT'
						})
					})
				}
			}

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
				const existingBytes = prev.reduce((sum, img) => sum + img.file.size, 0)
				let addedBytes = 0
				let countLimitHit = false
				let totalSizeLimitHit = false
				const withinBudget: SelectedImage[] = [...prev]

				for (const img of newImages) {
					if (withinBudget.length >= maxImages) {
						countLimitHit = true
						if (img.url) URL.revokeObjectURL(img.url)
						continue
					}
					if (existingBytes + addedBytes + img.file.size > MAX_TOTAL_BYTES) {
						totalSizeLimitHit = true
						if (img.url) URL.revokeObjectURL(img.url)
						continue
					}
					addedBytes += img.file.size
					withinBudget.push(img)
				}

				if (countLimitHit) {
					queueMicrotask(() => {
						errorToast({
							title: 'File upload limit',
							description: `You may upload only ${maxImages} files at a time`
						})
					})
				}

				if (totalSizeLimitHit && withinBudget.length === prev.length) {
					const totalMB = Math.round(MAX_TOTAL_BYTES / (1024 * 1024))
					queueMicrotask(() => {
						errorToast({
							title: 'Total upload size exceeded',
							description: `Combined files must be under ${totalMB}MB`
						})
					})
					return prev
				}

				return withinBudget
			})

			for (const { file } of newImages) {
				if (!isReadableTextFile(file)) continue
				file
					.text()
					.then((textContent) => {
						setSelectedImages((prev) => prev.map((img) => (img.file === file ? { ...img, textContent } : img)))
					})
					.catch((error) => {
						console.error('Failed to read text file content', file.name, error)
					})
			}
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
				.filter((file): file is File => Boolean(file))
			if (files.length) {
				trackUmamiEvent('llamaai-file-paste')
				addImages(files)
			}
		},
		[addImages]
	)

	const addPastedText = useCallback(
		(text: string) => {
			if (!text) return
			pastedCounterRef.current += 1
			const filename = `Pasted-${pastedCounterRef.current}.txt`
			const file = new File([text], filename, { type: 'text/plain', lastModified: Date.now() })
			const sizeLimit = maxSizeBytes ?? FILE_MAX_SIZE
			if (file.size > sizeLimit) {
				const limitMB = Math.round(sizeLimit / (1024 * 1024))
				queueMicrotask(() => {
					errorToast({
						title: 'Pasted text too large',
						description: `Pasted content exceeds the ${limitMB}MB limit`
					})
				})
				return
			}

			trackUmamiEvent('llamaai-paste-as-file')
			setSelectedImages((prev) => {
				if (prev.length >= maxImages) {
					queueMicrotask(() => {
						errorToast({
							title: 'File upload limit',
							description: `You may upload only ${maxImages} files at a time`
						})
					})
					return prev
				}
				const existingBytes = prev.reduce((sum, img) => sum + img.file.size, 0)
				if (existingBytes + file.size > MAX_TOTAL_BYTES) {
					const totalMB = Math.round(MAX_TOTAL_BYTES / (1024 * 1024))
					queueMicrotask(() => {
						errorToast({
							title: 'Total upload size exceeded',
							description: `Combined files must be under ${totalMB}MB`
						})
					})
					return prev
				}
				return [...prev, { file, url: '', isPasted: true, textContent: text }]
			})
		},
		[maxImages, maxSizeBytes]
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
			const files = Array.from(e.dataTransfer.files)
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
		pastedPreview,
		setPastedPreview,
		fileInputRef,
		addImages,
		addPastedText,
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
