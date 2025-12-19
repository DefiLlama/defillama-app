import { Icon } from '~/components/Icon'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import type { ActiveFilterChip } from '../utils/filterChips'
import type { UnifiedRowHeaderType } from '../../../types'
import { CsvExportDropdown, type CsvExportLevel } from './CsvExportDropdown'

export interface GroupingOption {
	id: string
	label: string
}

export interface UnifiedTableHeaderProps {
	title: string
	scopeDescription: string
	rowHeadersSummary: string | null
	onCustomizeColumns?: () => void
	onCsvExport?: () => void
	onCsvExportLevel?: (level: CsvExportLevel) => void
	rowHeaders?: UnifiedRowHeaderType[]
	isExportDisabled?: boolean
	isLoading?: boolean
	searchTerm: string
	onSearchChange: (value: string) => void
	filterChips: ActiveFilterChip[]
	onFilterRemove?: (chip: ActiveFilterChip) => void
	onClearFilters?: () => void
	filtersEditable?: boolean
	activeFilterCount: number
	onFiltersClick?: () => void
	groupingOptions?: GroupingOption[]
	selectedGroupingId?: string
	onGroupingChange?: (optionId: string) => void
}

export function UnifiedTableHeader({
	title,
	scopeDescription,
	rowHeadersSummary,
	onCustomizeColumns,
	onCsvExport,
	onCsvExportLevel,
	rowHeaders,
	isExportDisabled = false,
	isLoading = false,
	searchTerm,
	onSearchChange,
	filterChips,
	onFilterRemove,
	onClearFilters,
	filtersEditable = false,
	activeFilterCount,
	onFiltersClick,
	groupingOptions,
	selectedGroupingId,
	onGroupingChange
}: UnifiedTableHeaderProps) {
	const hasGrouping = rowHeaders && rowHeaders.length > 1
	const csvDisabled = isExportDisabled || (!onCsvExport && !onCsvExportLevel)
	const customizeDisabled = !onCustomizeColumns
	const hasFilters = filterChips.length > 0
	const canMutateFilters = filtersEditable && Boolean(onFilterRemove)
	const isGroupingInteractive = Boolean(onGroupingChange)
	const groupingSelectValue = groupingOptions
		? groupingOptions.find((option) => option.id === selectedGroupingId)?.id || groupingOptions[0]?.id || ''
		: ''

	return (
		<div className="mb-3 flex flex-col gap-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-1">
					<h3 className="text-base font-semibold text-(--text-primary)">{title}</h3>
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
					{groupingOptions?.length ? (
						<div className="relative">
							<select
								value={groupingSelectValue}
								onChange={(event) => onGroupingChange?.(event.target.value)}
								disabled={!isGroupingInteractive}
								className={`pro-border pro-bg1 pro-text1 appearance-none rounded-md border px-3 py-1.5 pr-8 text-sm transition-colors ${
									isGroupingInteractive ? 'pro-hover-bg' : 'cursor-not-allowed opacity-60'
								}`}
							>
								{groupingOptions.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
							<Icon
								name="chevron-down"
								height={14}
								width={14}
								className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-(--text-tertiary)"
							/>
						</div>
					) : null}
					{onFiltersClick ? (
						<button
							type="button"
							onClick={onFiltersClick}
							className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
								activeFilterCount
									? 'border-(--primary) bg-(--primary)/10 text-(--primary)'
									: 'pro-border pro-bg1 pro-hover-bg pro-text1'
							}`}
						>
							<span>Filters</span>
							<span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-(--cards-border) px-1 text-xs font-semibold text-(--text-secondary)">
								{activeFilterCount}
							</span>
						</button>
					) : null}
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
					{hasGrouping && onCsvExportLevel && rowHeaders ? (
						<CsvExportDropdown
							rowHeaders={rowHeaders}
							onExport={onCsvExportLevel}
							isLoading={isLoading}
							disabled={csvDisabled}
						/>
					) : (
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
					)}
				</div>
			</div>

			<div className="mt-2 flex flex-col gap-2">
				<div className="relative w-full">
					<Icon
						name="search"
						height={16}
						width={16}
						className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--text-tertiary)"
					/>
					<input
						type="search"
						value={searchTerm}
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder="Search protocols, chains, categories..."
						className="w-full rounded-md border border-(--divider) bg-(--cards-bg) py-2 pr-3 pl-9 text-sm text-(--text-primary) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/30 focus:outline-none"
					/>
				</div>
				{hasFilters ? (
					<div className="flex flex-wrap items-center gap-2">
						{filterChips.map((chip) => (
							<span
								key={chip.id}
								className="inline-flex items-center gap-1 rounded-full border border-(--cards-border) bg-(--cards-bg) px-2 py-1 text-xs text-(--text-secondary)"
							>
								<span className="font-medium text-(--text-primary)">{chip.label}</span>
								{chip.value ? <span className="text-(--text-secondary)">: {chip.value}</span> : null}
								{canMutateFilters ? (
									<button
										type="button"
										onClick={() => onFilterRemove?.(chip)}
										className="ml-1 rounded-full p-0.5 text-(--text-tertiary) transition-colors hover:bg-(--divider) hover:text-(--text-primary)"
										aria-label={`Remove filter: ${chip.label}`}
									>
										<Icon name="x" height={12} width={12} />
									</button>
								) : null}
							</span>
						))}
						{hasFilters && canMutateFilters && onClearFilters ? (
							<button
								type="button"
								onClick={onClearFilters}
								className="text-xs font-medium text-(--primary) hover:underline"
							>
								Clear all filters
							</button>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	)
}
