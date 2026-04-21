'use no memo'

import { flexRender, type RowData, type Table as ReactTable } from '@tanstack/react-table'
import { createContext, startTransition, useContext, useMemo } from 'react'
import { Icon } from '~/components/Icon'
import {
	TokenPageTable,
	TokenPageTableBodyCell,
	TokenPageTableHeaderCell,
	TokenPageTableScroller,
	TokenPageTableShell
} from '~/components/Table/helpers'
import { SortIcon } from '~/components/Table/SortIcon'
import { Tooltip } from '~/components/Tooltip'

interface PaginatedTableProps<T extends RowData> {
	table: ReactTable<T>
	pageSizeOptions: readonly number[]
	className?: string
	tableClassName?: string
}

const DisplayRowNumbersContext = createContext<Map<string, number> | null>(null)

function HeaderWithTooltip({
	children,
	content,
	onClick
}: {
	children: React.ReactNode
	content?: string
	onClick: ((event: React.MouseEvent<HTMLElement>) => void) | null
}) {
	if (onClick) {
		if (!content) {
			return (
				<button type="button" onClick={onClick} className="inline-flex items-center gap-1 whitespace-nowrap">
					{children}
				</button>
			)
		}

		return (
			<Tooltip
				content={content}
				className="underline decoration-dotted"
				render={<button type="button" className="inline-flex items-center gap-1 whitespace-nowrap" />}
				onClick={onClick}
			>
				{children}
			</Tooltip>
		)
	}

	if (!content) return <>{children}</>

	return (
		<Tooltip content={content} className="underline decoration-dotted">
			{children}
		</Tooltip>
	)
}

export function usePaginatedTableDisplayRowNumber(rowId: string) {
	return useContext(DisplayRowNumbersContext)?.get(rowId)
}

export function PaginatedTable<T extends RowData>({
	table,
	pageSizeOptions,
	className,
	tableClassName
}: PaginatedTableProps<T>) {
	const rows = table.getRowModel().rows
	const rowCount = table.getRowCount()
	const { pageIndex, pageSize } = table.getState().pagination
	const pageCount = table.getPageCount()
	const displayPageCount = Math.max(1, pageCount)
	const displayPageIndex = pageCount === 0 ? 0 : Math.min(pageIndex, displayPageCount - 1)
	const availablePageSizeOptions = useMemo(() => {
		const filteredOptions = pageSizeOptions.filter((pageSizeOption) => pageSizeOption <= rowCount)
		if (pageSize > rowCount && pageSizeOptions.includes(pageSize)) {
			filteredOptions.push(pageSize)
		}

		return [...new Set(filteredOptions)].sort((a, b) => a - b)
	}, [pageSize, pageSizeOptions, rowCount])
	const shouldShowPaginationControls = rowCount > 10 && pageCount > 1
	const shouldShowPageSizeSelector = rowCount > 10 && availablePageSizeOptions.length >= 2
	const displayRowNumbers = useMemo(
		() => new Map(rows.map((row, rowIndex) => [row.id, pageIndex * pageSize + rowIndex + 1])),
		[pageIndex, pageSize, rows]
	)

	return (
		<DisplayRowNumbersContext.Provider value={displayRowNumbers}>
			<div className={`flex flex-col gap-3 ${className ?? ''}`}>
				<TokenPageTableShell>
					<TokenPageTableScroller>
						<TokenPageTable className={tableClassName}>
							<thead>
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id} className="border-b border-(--cards-border) bg-(--app-bg)">
										{headerGroup.headers.map((header) => {
											const align = header.column.columnDef.meta?.align ?? 'start'
											const headerAlignmentClass =
												align === 'center' ? 'mx-auto w-fit' : align === 'end' ? 'ml-auto w-fit' : 'w-fit'

											return (
												<TokenPageTableHeaderCell
													key={header.id}
													textAlign={align}
													className={header.column.columnDef.meta?.headerClassName}
												>
													{header.isPlaceholder ? null : (
														<div className={headerAlignmentClass}>
															<HeaderWithTooltip
																content={header.column.columnDef.meta?.headerHelperText}
																onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : null}
															>
																{flexRender(header.column.columnDef.header, header.getContext())}
																{header.column.getCanSort() ? <SortIcon dir={header.column.getIsSorted()} /> : null}
															</HeaderWithTooltip>
														</div>
													)}
												</TokenPageTableHeaderCell>
											)
										})}
									</tr>
								))}
							</thead>
							<tbody>
								{rows.map((row) => (
									<tr key={row.id} className="border-b border-(--cards-border) last:border-b-0">
										{row.getVisibleCells().map((cell) => {
											const align = cell.column.columnDef.meta?.align ?? 'start'

											return (
												<TokenPageTableBodyCell key={cell.id} textAlign={align}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TokenPageTableBodyCell>
											)
										})}
									</tr>
								))}
							</tbody>
						</TokenPageTable>
					</TokenPageTableScroller>
				</TokenPageTableShell>

				{shouldShowPaginationControls || shouldShowPageSizeSelector ? (
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							{shouldShowPaginationControls ? (
								<>
									<button
										type="button"
										aria-label="Go to first page"
										onClick={() => startTransition(() => table.setPageIndex(0))}
										disabled={!table.getCanPreviousPage()}
										className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon name="chevrons-left" height={16} width={16} />
									</button>
									<button
										type="button"
										aria-label="Go to previous page"
										onClick={() => startTransition(() => table.previousPage())}
										disabled={!table.getCanPreviousPage()}
										className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon name="chevron-left" height={16} width={16} />
									</button>
									<span className="text-xs text-(--text-secondary)">
										{`Page ${displayPageIndex + 1} of ${displayPageCount}`}
									</span>
									<button
										type="button"
										aria-label="Go to next page"
										onClick={() => startTransition(() => table.nextPage())}
										disabled={!table.getCanNextPage()}
										className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon name="chevron-right" height={16} width={16} />
									</button>
									<button
										type="button"
										aria-label="Go to last page"
										onClick={() => startTransition(() => table.setPageIndex(Math.max(0, table.getPageCount() - 1)))}
										disabled={!table.getCanNextPage()}
										className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon name="chevrons-right" height={16} width={16} />
									</button>
								</>
							) : null}
						</div>

						{shouldShowPageSizeSelector ? (
							<label className="flex items-center gap-2 text-sm">
								<span className="text-(--text-secondary)">Rows per page</span>
								<select
									value={pageSize}
									onChange={(event) =>
										startTransition(() => {
											table.setPageSize(Number(event.target.value))
											table.setPageIndex(0)
										})
									}
									className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1"
								>
									{availablePageSizeOptions.map((pageSizeOption) => (
										<option key={pageSizeOption} value={pageSizeOption}>
											{pageSizeOption}
										</option>
									))}
								</select>
							</label>
						) : null}
					</div>
				) : null}
			</div>
		</DisplayRowNumbersContext.Provider>
	)
}
