import { useMemo } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { COLUMN_DICTIONARY_BY_ID } from '~/containers/ProDashboard/components/UnifiedTable/config/ColumnDictionary'
import type { CustomColumnDefinition } from '~/containers/ProDashboard/types'

interface SortingSelectorProps {
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
	sorting: SortingState
	onChange: (sorting: SortingState) => void
	onReset?: () => void
	customColumns?: CustomColumnDefinition[]
}

const NAME_COLUMN_META = {
	header: 'Name',
	group: 'meta'
}

const formatLabel = (header: string, group?: string) => {
	if (!group || group === 'meta') {
		return header
	}
	return `${header} · ${group.charAt(0).toUpperCase()}${group.slice(1)}`
}

export function SortingSelector({
	columnOrder,
	columnVisibility,
	sorting,
	onChange,
	onReset,
	customColumns
}: SortingSelectorProps) {
	const currentSorting = sorting[0]
	const currentColumn = currentSorting?.id ?? ''
	const isDescending = currentSorting?.desc ?? true

	const customColumnsMap = useMemo(() => {
		const map = new Map<string, CustomColumnDefinition>()
		for (const col of customColumns ?? []) {
			map.set(col.id, col)
		}
		return map
	}, [customColumns])

	const selectableColumns = useMemo(() => {
		return columnOrder
			.filter((id) => columnVisibility[id] ?? true)
			.map((id) => {
				const customCol = customColumnsMap.get(id)
				if (customCol) {
					return {
						id,
						header: customCol.name,
						group: 'custom'
					}
				}
				const dictionaryMeta = COLUMN_DICTIONARY_BY_ID.get(id)
				const meta = id === 'name' ? NAME_COLUMN_META : dictionaryMeta
				return {
					id,
					header: meta?.header ?? id,
					group: meta?.group
				}
			})
	}, [columnOrder, columnVisibility, customColumnsMap])

	const handleColumnChange = (value: string) => {
		if (!value) {
			onChange([])
			return
		}

		const nextDesc = currentColumn === value ? isDescending : true
		onChange([{ id: value, desc: nextDesc }])
	}

	const handleDirectionChange = (desc: boolean) => {
		if (!currentColumn) return
		onChange([{ id: currentColumn, desc }])
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4 shadow-sm">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label className="text-sm font-medium text-(--text-primary)" htmlFor="unified-sorting-column">
					Sort column
				</label>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<select
						id="unified-sorting-column"
						value={currentColumn}
						onChange={(event) => handleColumnChange(event.target.value)}
						className="w-full min-w-[180px] rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-primary) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 focus:outline-none sm:w-auto"
					>
						<option value="">No sorting</option>
						{selectableColumns.map((column) => (
							<option key={column.id} value={column.id}>
								{formatLabel(column.header, column.group)}
							</option>
						))}
					</select>
					<div className="flex overflow-hidden rounded-md border border-(--cards-border)">
						<button
							type="button"
							onClick={() => handleDirectionChange(false)}
							disabled={!currentColumn}
							className={`px-3 py-2 text-xs font-medium transition ${
								!currentColumn
									? 'cursor-not-allowed text-(--text-tertiary)'
									: !isDescending
										? 'bg-(--primary) text-white'
										: 'bg-(--bg-tertiary) text-(--text-secondary) hover:text-(--text-primary)'
							}`}
						>
							Asc
						</button>
						<button
							type="button"
							onClick={() => handleDirectionChange(true)}
							disabled={!currentColumn}
							className={`border-l border-(--cards-border) px-3 py-2 text-xs font-medium transition ${
								!currentColumn
									? 'cursor-not-allowed text-(--text-tertiary)'
									: isDescending
										? 'bg-(--primary) text-white'
										: 'bg-(--bg-tertiary) text-(--text-secondary) hover:text-(--text-primary)'
							}`}
						>
							Desc
						</button>
					</div>
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--text-tertiary)">
				<span>Tip: You can also click any column header in the preview to adjust sorting.</span>
				{onReset ? (
					<button
						type="button"
						onClick={onReset}
						className="text-(--primary) underline decoration-dotted underline-offset-2 transition hover:text-(--primary-dark)"
					>
						Reset to preset default
					</button>
				) : null}
			</div>
		</div>
	)
}
