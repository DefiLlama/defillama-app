import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface ImagePreviewModalProps {
	imageUrl: string | null
	onClose: () => void
	source?: 'user-upload' | 'generated' | 'input-preview'
	sessionId?: string | null
	messageId?: string
}

function extractFilename(url: string): string {
	try {
		const pathname = new URL(url).pathname
		const last = pathname.split('/').filter(Boolean).pop()
		return last || 'defillama-image.png'
	} catch {
		return 'defillama-image.png'
	}
}

export function ImagePreviewModal({ imageUrl, onClose, source, sessionId, messageId }: ImagePreviewModalProps) {
	const [copied, setCopied] = useState(false)
	const [downloading, setDownloading] = useState(false)

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) onClose()
	}

	const handleCopyUrl = async () => {
		if (!imageUrl) return
		try {
			await navigator.clipboard.writeText(imageUrl)
			trackUmamiEvent('llamaai-download', {
				kind: 'image-copy-url',
				filename: extractFilename(imageUrl),
				url: imageUrl,
				source: source ?? '',
				sessionId: sessionId ?? '',
				messageId: messageId ?? ''
			})
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {
			// Ignore clipboard failures silently — user can still use the "open" button.
		}
	}

	const handleDownload = async () => {
		if (!imageUrl || downloading) return
		setDownloading(true)
		try {
			const response = await fetch(imageUrl)
			const blob = await response.blob()
			const objectUrl = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = objectUrl
			link.download = extractFilename(imageUrl)
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(objectUrl)
			trackUmamiEvent('llamaai-download', {
				kind: 'image',
				filename: extractFilename(imageUrl),
				url: imageUrl,
				source: source ?? '',
				sessionId: sessionId ?? '',
				messageId: messageId ?? ''
			})
		} catch {
			// Fallback: open in new tab if CORS blocks the fetch.
			window.open(imageUrl, '_blank', 'noopener,noreferrer')
		} finally {
			setDownloading(false)
		}
	}

	return (
		<Ariakit.DialogProvider open={!!imageUrl} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				className="data-[enter]:animate-in data-[leave]:animate-out data-[enter]:fade-in data-[leave]:fade-out fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md data-[enter]:duration-150"
				portal
				unmountOnHide
				onClick={handleBackdropClick}
			>
				{imageUrl ? (
					<div className="relative flex max-h-full max-w-full flex-col items-center gap-3">
						<div className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
							<img src={imageUrl} alt="Preview" className="block max-h-[80vh] max-w-[90vw] object-contain" />
						</div>
						<div className="flex items-center gap-2 rounded-full bg-black/60 px-2 py-1.5 ring-1 ring-white/10 backdrop-blur-md">
							<button
								type="button"
								onClick={handleCopyUrl}
								title={copied ? 'Copied!' : 'Copy URL'}
								className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
							>
								<Icon name={copied ? 'check' : 'copy'} height={14} width={14} />
								<span>{copied ? 'Copied' : 'Copy URL'}</span>
							</button>
							<button
								type="button"
								onClick={handleDownload}
								disabled={downloading}
								title="Download"
								className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
							>
								<Icon name="download-cloud" height={14} width={14} />
								<span>{downloading ? 'Saving…' : 'Download'}</span>
							</button>
							<a
								href={imageUrl}
								target="_blank"
								rel="noopener noreferrer"
								title="Open in new tab"
								className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
							>
								<Icon name="external-link" height={14} width={14} />
								<span>Open</span>
							</a>
						</div>
					</div>
				) : null}

				<Ariakit.DialogDismiss
					className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
					title="Close"
				>
					<Icon name="x" height={18} width={18} />
					<span className="sr-only">Close preview</span>
				</Ariakit.DialogDismiss>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
