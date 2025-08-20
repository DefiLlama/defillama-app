import * as React from 'react'
import { flexRender, Table } from '@tanstack/react-table'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { SortIcon } from '~/components/Table/SortIcon'
import { ReorderableHeader } from './ReorderableHeader'

interface TableBodyProps {
	table: Table<IProtocolRow> | null
	moveColumnUp?: (columnId: string) => void
	moveColumnDown?: (columnId: string) => void
}

export function TableBody({ table, moveColumnUp, moveColumnDown }: TableBodyProps) {
	if (!table) {
		return (
			<div
				className="thin-scrollbar relative min-h-0 w-full flex-1 overflow-x-auto overflow-y-auto"
				style={{ height: '100%' }}
			>
				<div className="flex h-32 items-center justify-center">
					<div className="text-(--text-tertiary)">Loading table...</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className="thin-scrollbar relative -mx-2 min-h-0 w-full flex-1 overflow-auto px-2 sm:mx-0 sm:px-0"
			style={{ height: '100%' }}
		>
			<table className="w-full min-w-[600px] border-collapse text-xs text-(--text-primary) sm:text-sm">
				<thead className="sticky top-0 z-10">
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header, index) => {
								const visibleColumns = headerGroup.headers.filter((h) => !h.isPlaceholder)
								const columnIndex = visibleColumns.indexOf(header)
								const isFirst = columnIndex === 0
								const isLast = columnIndex === visibleColumns.length - 1

								return (
									<th
										key={header.id}
										colSpan={header.colSpan}
										className={`pro-bg1 relative border-r border-b border-(--divider) px-1 py-2 font-medium last:border-r-0 sm:px-2 ${
											header.column.columnDef.meta?.align === 'end' ? 'text-right' : 'text-left'
										}`}
										style={{
											minWidth: columnIndex === 0 ? '120px' : '60px',
											width: header.column.columnDef.size
										}}
									>
										{header.isPlaceholder ? null : (
											<ReorderableHeader
												columnId={header.column.id}
												canSort={header.column.getCanSort()}
												isSorted={header.column.getIsSorted()}
												onSort={() => header.column.toggleSorting()}
												onMoveUp={moveColumnUp ? () => moveColumnUp(header.column.id) : undefined}
												onMoveDown={moveColumnDown ? () => moveColumnDown(header.column.id) : undefined}
												canMoveUp={!isFirst}
												canMoveDown={!isLast}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
											</ReorderableHeader>
										)}
									</th>
								)
							})}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr key={row.id} className="border-b border-(--divider) hover:bg-(--bg-tertiary)">
							{row.getVisibleCells().map((cell, cellIndex) => (
								<td
									key={cell.id}
									className={`border-r border-(--divider) px-1 py-2 last:border-r-0 sm:px-2 ${
										cell.column.columnDef.meta?.align === 'end' ? 'text-right' : 'text-left'
									}`}
									style={{
										minWidth: cellIndex === 0 ? '120px' : '60px',
										maxWidth: cellIndex === 0 ? '250px' : '150px',
										width: cell.column.columnDef.size
									}}
								>
									{cellIndex === 0 ? (
										<div className="min-h-[20px]">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
									) : (
										<div
											className="truncate"
											title={
												typeof cell.getValue() === 'string' || typeof cell.getValue() === 'number'
													? String(cell.getValue())
													: ''
											}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</div>
									)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
