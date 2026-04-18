import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { sanitizeUrl } from '~/containers/LlamaAI/utils/markdownHelpers'

interface MarkdownExportArtifactProps {
	mdExport: {
		id: string
		title: string
		url: string
		filename: string
	}
}

export function MarkdownExportArtifact({ mdExport }: MarkdownExportArtifactProps) {
	const safeUrl = sanitizeUrl(mdExport.url)
	const [isDownloading, setIsDownloading] = useState(false)

	if (!safeUrl) return null

	const handleDownload = async (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault()
		if (isDownloading) return
		setIsDownloading(true)
		try {
			const response = await fetch(safeUrl)
			if (!response.ok) throw new Error(`Failed to fetch markdown: ${response.status}`)
			const blob = await response.blob()
			const objectUrl = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = objectUrl
			link.download = mdExport.filename
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(objectUrl)
		} catch {
			window.open(safeUrl, '_blank', 'noopener,noreferrer')
		} finally {
			setIsDownloading(false)
		}
	}

	return (
		<a
			href={safeUrl}
			download={mdExport.filename}
			onClick={handleDownload}
			className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 transition-colors hover:border-[#2172E5] hover:bg-[#2172E5]/5 dark:border-[#222324] dark:bg-[#181A1C] dark:hover:border-[#2172E5]"
		>
			<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2172E5]/10">
				<Icon name="file-text" className="h-5 w-5 text-[#2172E5]" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="m-0 truncate text-sm font-medium text-(--text1)">{mdExport.title}</span>
				<span className="m-0 text-xs text-(--text3)">{isDownloading ? 'Downloading…' : 'Markdown file'}</span>
			</span>
			<span className="flex shrink-0 items-center gap-1.5 text-[#2172E5]">
				<Icon name="download-paper" className="h-4 w-4" />
				<span className="text-sm font-medium">.md</span>
			</span>
		</a>
	)
}
