import { Icon } from '~/components/Icon'
import { ProTableCSVButton } from '../../ProTable/CsvButton'

export interface UnifiedTableHeaderProps {
	title: string
	scopeDescription: string
	rowHeadersSummary: string | null
	onCustomizeColumns?: () => void
	onCsvExport?: () => void
	isExportDisabled?: boolean
	isLoading?: boolean
}

export function UnifiedTableHeader({
	title,
	scopeDescription,
	rowHeadersSummary,
	onCustomizeColumns,
	onCsvExport,
	isExportDisabled = false,
	isLoading = false
}: UnifiedTableHeaderProps) {
	const csvDisabled = isExportDisabled || !onCsvExport
	const customizeDisabled = !onCustomizeColumns

	return (
		<div className="mb-3 flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="text-base font-semibold text-(--text-primary)">{title}</h3>
				</div>
				<div className="flex flex-wrap gap-2 text-xs text-(--text-secondary)">
					<span>{scopeDescription}</span>
					{rowHeadersSummary && (
						<>
							<span>•</span>
							<span>Grouped by {rowHeadersSummary}</span>
						</>
					)}
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-end gap-2">
				<button
					type="button"
					onClick={() => onCustomizeColumns?.()}
					disabled={customizeDisabled}
					className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
						customizeDisabled
							? 'cursor-not-allowed border-(--cards-border) text-(--text-tertiary)'
							: 'pro-border pro-bg1 pro-hover-bg pro-text1'
					}`}
				>
					<Icon name="settings" height={14} width={14} />
					<span>Customize Columns</span>
				</button>
				<ProTableCSVButton
					onClick={() => {
						if (csvDisabled) return
						onCsvExport?.()
					}}
					isLoading={isLoading}
					className={`pro-border pro-bg1 pro-hover-bg pro-text1 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
						csvDisabled ? 'cursor-not-allowed opacity-60' : ''
					}`}
				/>
			</div>
		</div>
	)
}
