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
	if (!safeUrl) return null

	return (
		<a
			href={safeUrl}
			download={mdExport.filename}
			className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 transition-colors hover:border-[#2172E5] hover:bg-[#2172E5]/5 dark:border-[#222324] dark:bg-[#181A1C] dark:hover:border-[#2172E5]"
		>
			<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2172E5]/10">
				<Icon name="file-text" className="h-5 w-5 text-[#2172E5]" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="m-0 truncate text-sm font-medium text-(--text1)">{mdExport.title}</span>
				<span className="m-0 text-xs text-(--text3)">Markdown file</span>
			</span>
			<span className="flex shrink-0 items-center gap-1.5 text-[#2172E5]">
				<Icon name="download-paper" className="h-4 w-4" />
				<span className="text-sm font-medium">.md</span>
			</span>
		</a>
	)
}
