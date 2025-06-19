import * as React from 'react'
import { Table, flexRender } from '@tanstack/react-table'
import { SortIcon } from '~/components/Table/SortIcon'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
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
				className="relative w-full flex-1 min-h-0 overflow-x-auto overflow-y-auto thin-scrollbar"
				style={{ height: '100%' }}
			>
				<div className="flex items-center justify-center h-32">
					<div className="text-[var(--text3)]">Loading table...</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className="relative w-full flex-1 min-h-0 overflow-x-auto overflow-y-auto thin-scrollbar"
			style={{ height: '100%' }}
		>
			<table className="min-w-full text-[var(--text1)] text-sm border-collapse">
				<thead>
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
										className="bg-transparent font-medium px-2 py-2 border-b border-r border-[var(--divider)] last:border-r-0 relative overflow-visible"
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
						<tr key={row.id} className="hover:bg-[var(--bg3)] border-b border-[var(--divider)]">
							{row.getVisibleCells().map((cell) => (
								<td
									key={cell.id}
									className="px-2 py-2 whitespace-nowrap border-r border-[var(--divider)] last:border-r-0"
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
