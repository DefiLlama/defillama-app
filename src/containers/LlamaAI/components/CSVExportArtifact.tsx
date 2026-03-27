import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'

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

export function CSVExportArtifact({ csvExport }: CSVExportArtifactProps) {
	const { hasActiveSubscription } = useAuthContext()

	if (!hasActiveSubscription) {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 opacity-60 dark:border-[#222324] dark:bg-[#181A1C]">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
					<Icon name="file-text" className="h-5 w-5 text-gray-400" />
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="m-0 truncate text-sm font-medium text-(--text1)">{csvExport.title}</span>
					<span className="m-0 text-xs text-(--text3)">CSV exports require a subscription</span>
				</span>
				<a
					href="https://defillama.com/subscription"
					className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#2172E5] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#1a5bbf]"
				>
					Subscribe
				</a>
			</div>
		)
	}

	return (
		<a
			href={csvExport.url}
			download={csvExport.filename}
			className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 transition-colors hover:border-[#2172E5] hover:bg-[#2172E5]/5 dark:border-[#222324] dark:bg-[#181A1C] dark:hover:border-[#2172E5]"
		>
			<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2172E5]/10">
				<Icon name="file-text" className="h-5 w-5 text-[#2172E5]" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="m-0 truncate text-sm font-medium text-(--text1)">{csvExport.title}</span>
				<span className="m-0 text-xs text-(--text3)">{csvExport.rowCount.toLocaleString()} rows</span>
			</span>
			<span className="flex shrink-0 items-center gap-1.5 text-[#2172E5]">
				<Icon name="download-paper" className="h-4 w-4" />
				<span className="text-sm font-medium">.csv</span>
			</span>
		</a>
	)
}

export function CSVExportLoading() {
	return (
		<div className="my-2 flex animate-pulse items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 dark:border-[#222324] dark:bg-[#181A1C]">
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
				<Icon name="file-text" className="h-5 w-5 text-gray-400" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
				<div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
			</div>
			<p className="m-0 text-xs text-gray-400">Generating...</p>
		</div>
	)
}
