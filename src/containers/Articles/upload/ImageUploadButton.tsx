import { useRef } from 'react'
import { Icon } from '~/components/Icon'
import { type UploadResult, type UploadScope, useImageUpload } from './useImageUpload'

type Props = {
	scope: UploadScope
	articleId?: string | null
	currentUrl?: string | null
	onUploaded: (result: UploadResult) => void
	onCleared?: () => void
	label: string
	helperText?: string
	previewShape?: 'square' | 'wide'
}

export function ImageUploadButton({
	scope,
	articleId = null,
	currentUrl,
	onUploaded,
	onCleared,
	label,
	helperText,
	previewShape = 'wide'
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null)
	const { uploadWithToast, isUploading } = useImageUpload({ scope, articleId })

	const handleFile = async (file: File | null | undefined) => {
		if (!file) return
		try {
			const result = await uploadWithToast(file)
			onUploaded(result)
		} catch {
			// surfaced via toast; nothing to do here
		} finally {
			if (inputRef.current) inputRef.current.value = ''
		}
	}

	const open = () => inputRef.current?.click()
	const isSquare = previewShape === 'square'

	return (
		<div className={isSquare ? 'flex items-start gap-4' : 'grid gap-2'}>
			<input
				ref={inputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/gif"
				className="sr-only"
				onChange={(e) => handleFile(e.target.files?.[0])}
			/>

			{isSquare ? (
				<>
					{currentUrl ? (
						<button
							type="button"
							onClick={open}
							disabled={isUploading}
							aria-label="Replace avatar"
							className="group relative size-24 shrink-0 overflow-hidden rounded-full border border-(--cards-border) transition-[border-color] outline-none hover:border-(--link-text)/50 focus-visible:border-(--link-text)/70 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={currentUrl}
								alt=""
								className="size-full object-cover transition-opacity group-hover:opacity-70"
							/>
							<span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-(--app-bg)/0 text-[11px] font-medium tracking-wide text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
								{isUploading ? 'Uploading…' : 'Replace'}
							</span>
						</button>
					) : (
						<button
							type="button"
							onClick={open}
							disabled={isUploading}
							className="group flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-full border border-dashed border-(--cards-border) bg-(--app-bg) text-(--text-tertiary) transition-colors hover:border-(--link-text)/50 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Icon name="image-plus" className="size-5" />
							<span className="text-[10px] font-medium tracking-wider uppercase">{isUploading ? '…' : 'Upload'}</span>
						</button>
					)}
					<div className="flex min-w-0 flex-col gap-2 pt-1">
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								disabled={isUploading}
								onClick={open}
								className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isUploading ? 'Uploading…' : currentUrl ? 'Replace' : `Upload ${label.toLowerCase()}`}
							</button>
							{currentUrl && onCleared ? (
								<button
									type="button"
									disabled={isUploading}
									onClick={onCleared}
									className="rounded-md px-2.5 py-1.5 text-xs text-(--text-tertiary) transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Remove
								</button>
							) : null}
						</div>
						{helperText ? (
							<span className="text-[11px] leading-relaxed text-(--text-tertiary)">{helperText}</span>
						) : null}
					</div>
				</>
			) : (
				<>
					{currentUrl ? (
						<div className="grid gap-2">
							<button
								type="button"
								onClick={open}
								disabled={isUploading}
								aria-label="Replace cover image"
								className="group relative block h-36 w-full overflow-hidden rounded-md border border-(--cards-border) transition-[border-color] outline-none hover:border-(--link-text)/50 focus-visible:border-(--link-text)/70 disabled:cursor-not-allowed"
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={currentUrl}
									alt=""
									className="size-full object-cover transition-opacity group-hover:opacity-70"
								/>
								<span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
									{isUploading ? 'Uploading…' : 'Replace'}
								</span>
							</button>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									disabled={isUploading}
									onClick={open}
									className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isUploading ? 'Uploading…' : 'Replace'}
								</button>
								{onCleared ? (
									<button
										type="button"
										disabled={isUploading}
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
							disabled={isUploading}
							onClick={open}
							className="group flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-(--cards-border) bg-(--app-bg) text-(--text-tertiary) transition-colors hover:border-(--link-text)/50 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Icon name="image-plus" className="size-5" />
							<span className="text-xs font-medium">
								{isUploading ? 'Uploading…' : `Upload ${label.toLowerCase()}`}
							</span>
						</button>
					)}
					{helperText ? <span className="text-[11px] text-(--text-tertiary)">{helperText}</span> : null}
				</>
			)}
		</div>
	)
}
