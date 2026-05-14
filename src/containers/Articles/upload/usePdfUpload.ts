import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { FEATURES_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscription/auth'

export type PdfUploadScope = 'report-pdf'

export type PdfUploadResult = {
	id: string
	url: string
	contentType: string
	sizeBytes: number
	originalName: string | null
}

const MAX_BYTES = 100 * 1024 * 1024
const ALLOWED_MIMES = new Set(['application/pdf'])

export class PdfUploadError extends Error {
	status: number
	constructor(message: string, status = 400) {
		super(message)
		this.name = 'PdfUploadError'
		this.status = status
	}
}

function uploadUrl() {
	return `${FEATURES_SERVER.replace(/\/$/, '')}/uploads/pdf`
}

function validateClient(file: File): string | null {
	if (!file) return 'No file selected'
	if (file.size === 0) return 'Empty file'
	if (file.size > MAX_BYTES) return 'File exceeds 100 MB limit'
	const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
	if (!looksLikePdf) return 'Only PDF files are allowed'
	if (file.type && !ALLOWED_MIMES.has(file.type)) return 'Only PDF files are allowed'
	return null
}

async function fileToBase64(file: File): Promise<string> {
	const buf = await file.arrayBuffer()
	const bytes = new Uint8Array(buf)
	let binary = ''
	const chunkSize = 0x8000
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
	}
	return btoa(binary)
}

export function usePdfUpload(args: { articleId: string | null | undefined }) {
	const { authorizedFetch } = useAuthContext()
	const [isUploading, setIsUploading] = useState(false)

	const uploadFile = useCallback(
		async (file: File): Promise<PdfUploadResult> => {
			const clientError = validateClient(file)
			if (clientError) throw new PdfUploadError(clientError, 400)
			if (!args.articleId) throw new PdfUploadError('Save the article before uploading a PDF', 400)

			const dataBase64 = await fileToBase64(file)
			const payload = {
				scope: 'report-pdf' as PdfUploadScope,
				articleId: args.articleId,
				originalName: file.name,
				mimeType: file.type || 'application/pdf',
				dataBase64
			}

			setIsUploading(true)
			try {
				const response = await authorizedFetch(uploadUrl(), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				})
				if (!response) throw new PdfUploadError('Please sign in to continue', 401)
				const text = await response.text()
				const data = text ? JSON.parse(text) : null
				if (!response.ok) {
					const message =
						data && typeof data === 'object' && typeof data.error === 'string'
							? data.error
							: response.statusText || 'Upload failed'
					throw new PdfUploadError(message, response.status)
				}
				return data as PdfUploadResult
			} finally {
				setIsUploading(false)
			}
		},
		[args.articleId, authorizedFetch]
	)

	const uploadWithToast = useCallback(
		async (file: File): Promise<PdfUploadResult> => {
			return toast.promise(uploadFile(file), {
				loading: 'Uploading PDF…',
				success: 'PDF uploaded',
				error: (err) => (err instanceof Error ? err.message : 'Upload failed')
			})
		},
		[uploadFile]
	)

	return { uploadFile, uploadWithToast, isUploading }
}
