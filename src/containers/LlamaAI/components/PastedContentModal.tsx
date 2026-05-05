import * as Ariakit from '@ariakit/react'
import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'

interface PastedContentModalProps {
	preview: { content: string; filename: string; isPasted?: boolean } | null
	onClose: () => void
}

function formatBytes(byteLength: number): string {
	if (byteLength < 1024) return `${byteLength} B`
	const kb = byteLength / 1024
	if (kb < 1024) return `${kb.toFixed(kb < 10 ? 2 : 1)} KB`
	return `${(kb / 1024).toFixed(2)} MB`
}

export function PastedContentModal({ preview, onClose }: PastedContentModalProps) {
	const [copied, setCopied] = useState(false)

	const stats = useMemo(() => {
		if (!preview) return null
		const content = preview.content
		const lines = content.length === 0 ? 0 : content.split('\n').length
		const bytes = new Blob([content]).size
		return { lines, size: formatBytes(bytes) }
	}, [preview])

	const handleCopy = async () => {
		if (!preview) return
		try {
			await navigator.clipboard.writeText(preview.content)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {
			// silent
		}
	}

	return (
		<Ariakit.DialogProvider open={!!preview} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				className="dialog flex max-h-[85vh] w-[min(92vw,820px)] flex-col gap-0 overflow-hidden rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-0 shadow-xl dark:border-[#39393E] dark:bg-[#222429]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-sm" />}
				portal
				unmountOnHide
			>
				<header className="flex items-start justify-between gap-4 border-b border-[#E6E6E6] px-6 py-5 dark:border-[#39393E]">
					<div className="flex min-w-0 flex-col gap-1.5">
						<h2 className="m-0 truncate text-2xl font-semibold tracking-tight text-black dark:text-white">
							{preview?.isPasted ? 'Pasted content' : (preview?.filename ?? 'File preview')}
						</h2>
						{stats ? (
							<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#888] dark:text-[#919296]">
								<span>{stats.size}</span>
								<span aria-hidden className="h-1 w-1 rounded-full bg-current opacity-50" />
								<span>{stats.lines.toLocaleString()} lines</span>
								{preview?.isPasted ? (
									<>
										<span aria-hidden className="h-1 w-1 rounded-full bg-current opacity-50" />
										<span>Formatting may be inconsistent from source</span>
									</>
								) : null}
							</div>
						) : null}
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<button
							type="button"
							onClick={handleCopy}
							className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-[#666] transition-colors hover:bg-[#f3f3f3] hover:text-black dark:text-[#aaa] dark:hover:bg-[#2c2e34] dark:hover:text-white"
						>
							<Icon name={copied ? 'check' : 'copy'} height={14} width={14} />
							<span>{copied ? 'Copied' : 'Copy'}</span>
						</button>
						<Ariakit.DialogDismiss className="rounded-full p-1.5 text-[#666] transition-colors hover:bg-[#f3f3f3] hover:text-black dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white">
							<Icon name="x" className="h-5 w-5" />
							<span className="sr-only">Close</span>
						</Ariakit.DialogDismiss>
					</div>
				</header>

				<div className="thin-scrollbar flex-1 overflow-y-auto p-5">
					<pre className="m-0 max-h-[calc(85vh-148px)] overflow-auto rounded-xl border border-[#E6E6E6] bg-[#fafafa] p-4 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-[#1a1a1a] dark:border-[#39393E] dark:bg-[#1a1b1c] dark:text-[#dcdde0]">
						{preview?.content ?? ''}
					</pre>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
