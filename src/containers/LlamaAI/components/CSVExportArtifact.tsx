import { memo } from 'react'
import { Icon } from '~/components/Icon'

export interface CSVExport {
	id: string
	title: string
	url: string
	rowCount: number
	filename: string
}

interface CSVExportArtifactProps {
	csvExport: CSVExport
}

export const CSVExportArtifact = memo(function CSVExportArtifact({ csvExport }: CSVExportArtifactProps) {
	return (
		<a
			href={csvExport.url}
			download={csvExport.filename}
			className="my-2 flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 transition-colors hover:border-[#2172E5] hover:bg-[#2172E5]/5 dark:border-[#222324] dark:bg-[#181A1C] dark:hover:border-[#2172E5]"
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2172E5]/10">
				<Icon name="file-text" className="h-5 w-5 text-[#2172E5]" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm font-medium text-(--text1)">{csvExport.title}</span>
				<span className="text-xs text-(--text3)">{csvExport.rowCount.toLocaleString()} rows</span>
			</div>
			<div className="flex shrink-0 items-center gap-1.5 text-[#2172E5]">
				<Icon name="download-paper" className="h-4 w-4" />
				<span className="text-sm font-medium">.csv</span>
			</div>
		</a>
	)
})

export const CSVExportLoading = memo(function CSVExportLoading() {
	return (
		<div className="my-2 flex animate-pulse items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 dark:border-[#222324] dark:bg-[#181A1C]">
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
				<Icon name="file-text" className="h-5 w-5 text-gray-400" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
				<div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
			</div>
			<span className="text-xs text-gray-400">Generating...</span>
		</div>
	)
})
