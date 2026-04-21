import { useMutation } from '@tanstack/react-query'
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

async function downloadMarkdownFile({ url, filename }: { url: string; filename: string }) {
	try {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`Failed to download markdown (${response.status})`)
		}

		const blob = await response.blob()
		const objectUrl = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = objectUrl
		link.download = filename
		link.style.display = 'none'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(objectUrl)
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to download markdown')
	}
}

export function MarkdownExportArtifact({ mdExport }: MarkdownExportArtifactProps) {
	const safeUrl = sanitizeUrl(mdExport.url)
	const downloadMarkdownMutation = useMutation({
		mutationFn: downloadMarkdownFile
	})

	if (!safeUrl) return null

	return (
		<button
			type="button"
			disabled={downloadMarkdownMutation.isPending}
			onClick={() => downloadMarkdownMutation.mutate({ url: safeUrl, filename: mdExport.filename })}
			className="flex w-full items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 text-left transition-colors hover:border-[#2172E5] hover:bg-[#2172E5]/5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#222324] dark:bg-[#181A1C] dark:hover:border-[#2172E5]"
		>
			<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2172E5]/10">
				<Icon name="file-text" className="h-5 w-5 text-[#2172E5]" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="m-0 truncate text-sm font-medium text-(--text1)">{mdExport.title}</span>
				<span className="m-0 text-xs text-(--text3)">
					{downloadMarkdownMutation.isPending ? 'Downloading…' : 'Markdown file'}
				</span>
				{downloadMarkdownMutation.error ? (
					<span role="alert" className="m-0 text-xs text-(--error)">
						{downloadMarkdownMutation.error.message}
					</span>
				) : null}
			</span>
			<span className="flex shrink-0 items-center gap-1.5 text-[#2172E5]">
				<Icon name="download-paper" className="h-4 w-4" />
				<span className="text-sm font-medium">.md</span>
			</span>
		</button>
	)
}
