import { flexRender, type RowData, type Table as ReactTable } from '@tanstack/react-table'
import { startTransition } from 'react'
import { Icon } from '~/components/Icon'
import {
	TokenPageTable,
	TokenPageTableBodyCell,
	TokenPageTableHeaderCell,
	TokenPageTableScroller,
	TokenPageTableShell
} from '~/components/Table/helpers'
import { SortIcon } from '~/components/Table/SortIcon'

interface PaginatedTableProps<T extends RowData> {
	table: ReactTable<T>
	pageSizeOptions: readonly number[]
}

export function PaginatedTable<T extends RowData>({ table, pageSizeOptions }: PaginatedTableProps<T>) {
	const columnSizing = table.getState().columnSizing

	return (
		<div className="flex flex-col gap-3">
			<TokenPageTableShell>
				<TokenPageTableScroller>
					<TokenPageTable>
						<thead>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id} className="border-b border-(--cards-border) bg-(--app-bg)">
									{headerGroup.headers.map((header) => {
										const align = header.column.columnDef.meta?.align ?? 'start'
										const minWidth = columnSizing?.[header.column.id] ?? header.column.columnDef.size

										return (
											<TokenPageTableHeaderCell key={header.id} textAlign={align} minWidth={minWidth}>
												{header.isPlaceholder ? null : header.column.getCanSort() ? (
													<button
														type="button"
														onClick={header.column.getToggleSortingHandler()}
														className="inline-flex items-center gap-1 whitespace-nowrap"
														style={{
															marginLeft: align === 'end' || align === 'center' ? 'auto' : undefined,
															marginRight: align === 'center' ? 'auto' : undefined
														}}
													>
														{flexRender(header.column.columnDef.header, header.getContext())}
														<SortIcon dir={header.column.getIsSorted()} />
													</button>
												) : (
													flexRender(header.column.columnDef.header, header.getContext())
												)}
											</TokenPageTableHeaderCell>
										)
									})}
								</tr>
							))}
						</thead>
						<tbody>
							{table.getRowModel().rows.map((row) => (
								<tr key={row.id} className="border-b border-(--cards-border) last:border-b-0">
									{row.getVisibleCells().map((cell) => {
										const align = cell.column.columnDef.meta?.align ?? 'start'
										const minWidth = columnSizing?.[cell.column.id] ?? cell.column.columnDef.size

										return (
											<TokenPageTableBodyCell key={cell.id} textAlign={align} minWidth={minWidth}>
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

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
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
						{`Page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`}
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
				</div>

				<label className="flex items-center gap-2 text-sm">
					<span className="text-(--text-secondary)">Rows per page</span>
					<select
						value={table.getState().pagination.pageSize}
						onChange={(event) =>
							startTransition(() => {
								table.setPageSize(Number(event.target.value))
								table.setPageIndex(0)
							})
						}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1"
					>
						{pageSizeOptions.map((pageSize) => (
							<option key={pageSize} value={pageSize}>
								{pageSize}
							</option>
						))}
					</select>
				</label>
			</div>
		</div>
	)
}
