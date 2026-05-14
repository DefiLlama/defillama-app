import { useRef } from 'react'
import type { ArticlePdf } from '../types'
import { type PdfUploadResult, usePdfUpload } from './usePdfUpload'

type Props = {
	articleId: string | null | undefined
	currentPdf: ArticlePdf | null | undefined
	onUploaded: (result: PdfUploadResult) => void
	onCleared?: () => void
	helperText?: string
}

function formatSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '—'
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function PdfIcon({ className = 'h-5 w-5' }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
			<path d="M9 13h6M9 17h4" />
		</svg>
	)
}

export function PdfUploadButton({ articleId, currentPdf, onUploaded, onCleared, helperText }: Props) {
	const inputRef = useRef<HTMLInputElement>(null)
	const { uploadWithToast, isUploading } = usePdfUpload({ articleId })

	const handleFile = async (file: File | null | undefined) => {
		if (!file) return
		try {
			const result = await uploadWithToast(file)
			onUploaded(result)
		} catch {
			// surfaced via toast
		} finally {
			if (inputRef.current) inputRef.current.value = ''
		}
	}

	const open = () => inputRef.current?.click()
	const disabled = isUploading || !articleId

	return (
		<div className="grid gap-2">
			<input
				ref={inputRef}
				type="file"
				accept="application/pdf,.pdf"
				className="sr-only"
				onChange={(e) => handleFile(e.target.files?.[0])}
			/>
			{currentPdf ? (
				<div className="grid gap-2">
					<div className="flex items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<PdfIcon className="h-6 w-6 shrink-0 text-(--link-text)" />
						<div className="flex min-w-0 flex-col">
							<a
								href={currentPdf.url}
								target="_blank"
								rel="noopener noreferrer"
								className="truncate text-sm font-medium text-(--text-primary) hover:text-(--link-text)"
							>
								{currentPdf.originalName || 'report.pdf'}
							</a>
							<span className="text-[11px] text-(--text-tertiary)">
								{formatSize(currentPdf.sizeBytes)}
								{currentPdf.pageCount ? ` · ${currentPdf.pageCount} pages` : ''}
							</span>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							disabled={disabled}
							onClick={open}
							className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isUploading ? 'Uploading…' : 'Replace PDF'}
						</button>
						{onCleared ? (
							<button
								type="button"
								disabled={disabled}
								onClick={onCleared}
								className="rounded-md px-2.5 py-1.5 text-xs text-(--text-tertiary) transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Remove
							</button>
						) : null}
					</div>
				</div>
			) : (
				<button
					type="button"
					disabled={disabled}
					onClick={open}
					className="group flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-(--cards-border) bg-(--app-bg) text-(--text-tertiary) transition-colors hover:border-(--link-text)/50 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
				>
					<PdfIcon className="h-5 w-5" />
					<span className="text-xs font-medium">{isUploading ? 'Uploading…' : 'Upload PDF'}</span>
				</button>
			)}
			{helperText ? <span className="text-[11px] text-(--text-tertiary)">{helperText}</span> : null}
			{!articleId ? (
				<span className="text-[11px] text-(--text-tertiary)">Save the article first to enable PDF upload.</span>
			) : null}
		</div>
	)
}
