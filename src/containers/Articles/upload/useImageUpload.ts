import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { FEATURES_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscription/auth'

export type UploadScope = 'avatar' | 'article-cover' | 'article-inline'

export type UploadResult = {
	id: string
	url: string
	contentType: string
	sizeBytes: number
	width: number
	height: number
}

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export class ImageUploadError extends Error {
	status: number
	constructor(message: string, status = 400) {
		super(message)
		this.name = 'ImageUploadError'
		this.status = status
	}
}

function uploadUrl() {
	return `${FEATURES_SERVER.replace(/\/$/, '')}/uploads/image`
}

function validateClient(file: File): string | null {
	if (!file) return 'No file selected'
	if (file.size === 0) return 'Empty file'
	if (file.size > MAX_BYTES) return 'File exceeds 8 MB limit'
	if (!ALLOWED_MIMES.has(file.type)) return 'Allowed formats: PNG, JPEG, WebP, GIF'
	return null
}

export function useImageUpload(args: { scope: UploadScope; articleId?: string | null }) {
	const { authorizedFetch } = useAuthContext()
	const [isUploading, setIsUploading] = useState(false)

	const uploadFile = useCallback(
		async (file: File): Promise<UploadResult> => {
			const clientError = validateClient(file)
			if (clientError) throw new ImageUploadError(clientError, 400)

			const fd = new FormData()
			fd.append('file', file)
			fd.append('scope', args.scope)
			if (args.articleId) fd.append('articleId', args.articleId)

			setIsUploading(true)
			try {
				const response = await authorizedFetch(uploadUrl(), {
					method: 'POST',
					body: fd
				})
				if (!response) throw new ImageUploadError('Please sign in to continue', 401)
				const text = await response.text()
				const data = text ? JSON.parse(text) : null
				if (!response.ok) {
					const message =
						data && typeof data === 'object' && typeof data.error === 'string'
							? data.error
							: response.statusText || 'Upload failed'
					throw new ImageUploadError(message, response.status)
				}
				return data as UploadResult
			} finally {
				setIsUploading(false)
			}
		},
		[args.scope, args.articleId, authorizedFetch]
	)

	const uploadWithToast = useCallback(
		async (file: File): Promise<UploadResult> => {
			return toast.promise(uploadFile(file), {
				loading: 'Uploading…',
				success: 'Uploaded',
				error: (err) => (err instanceof Error ? err.message : 'Upload failed')
			})
		},
		[uploadFile]
	)

	return { uploadFile, uploadWithToast, isUploading }
}
